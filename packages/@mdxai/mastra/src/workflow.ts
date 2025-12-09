/**
 * @mdxai/mastra Workflow
 *
 * Workflow orchestration with Mastra
 *
 * @packageDocumentation
 */

import type { Database } from '@mdxdb/fs'
import type { MDXLDData, MDXLDDocument } from 'mdxld'
import type {
  MastraWorkflow,
  MastraWorkflowConfig,
  MastraWorkflowContext,
  MastraWorkflowStep,
  MastraWorkflowEvent,
  MastraAgent,
} from './types.js'
import { createMastraAgents } from './agent.js'

/**
 * Create a Mastra workflow
 *
 * @example
 * ```ts
 * import { createMastraWorkflow } from '@mdxai/mastra'
 *
 * const workflow = createMastraWorkflow({
 *   name: 'content-pipeline',
 *   agents: {
 *     researcher: researcherDoc,
 *     writer: writerDoc,
 *   },
 *   database: db,
 * })
 *
 * workflow
 *   .step('research', async (ctx) => {
 *     return ctx.agents.researcher.run(ctx.input as string)
 *   })
 *   .step('write', async (ctx) => {
 *     return ctx.agents.writer.run(ctx.steps.research.output as string)
 *   })
 *
 * const result = await workflow.run('Write about AI trends')
 * ```
 */
export function createMastraWorkflow(config: MastraWorkflowConfig): MastraWorkflow {
  const { name, agents: agentDocs, database, state: initialState } = config

  // Create agents from documents
  const agents: Record<string, MastraAgent> = agentDocs ? createMastraAgents(agentDocs) : {}

  // Workflow steps
  const steps: MastraWorkflowStep[] = []

  // Workflow state
  let workflowState = initialState || {}

  /**
   * Add a step to the workflow
   */
  function step(stepName: string, handler: MastraWorkflowStep['handler']): MastraWorkflow {
    steps.push({
      name: stepName,
      handler,
    })
    return workflow
  }

  /**
   * Add parallel steps
   */
  function parallel(parallelSteps: Record<string, MastraWorkflowStep['handler']>): MastraWorkflow {
    const parallelStepDef: MastraWorkflowStep = {
      name: `parallel-${steps.length}`,
      async handler(context) {
        const results = await Promise.all(
          Object.entries(parallelSteps).map(async ([stepName, stepHandler]) => {
            const result = await stepHandler(context)
            return [stepName, result] as const
          })
        )
        return Object.fromEntries(results)
      },
    }
    steps.push(parallelStepDef)
    return workflow
  }

  /**
   * Add a conditional branch
   */
  function branch(
    condition: (context: MastraWorkflowContext) => boolean | Promise<boolean>,
    trueBranch: MastraWorkflowStep['handler'],
    falseBranch?: MastraWorkflowStep['handler']
  ): MastraWorkflow {
    const branchStep: MastraWorkflowStep = {
      name: `branch-${steps.length}`,
      async handler(context) {
        const shouldExecuteTrueBranch = await condition(context)
        if (shouldExecuteTrueBranch) {
          return trueBranch(context)
        } else if (falseBranch) {
          return falseBranch(context)
        }
        return null
      },
    }
    steps.push(branchStep)
    return workflow
  }

  /**
   * Run the workflow
   */
  async function run(input: unknown): Promise<unknown> {
    const stepOutputs: Record<string, { output: unknown }> = {}

    for (const workflowStep of steps) {
      const context: MastraWorkflowContext = {
        input,
        steps: stepOutputs,
        agents,
        state: workflowState,
      }

      try {
        const output = await workflowStep.handler(context)
        stepOutputs[workflowStep.name] = { output }

        // Persist state if database is available
        if (database) {
          await database.set(`workflows/${name}/steps/${workflowStep.name}`, {
            type: 'WorkflowStep',
            data: {
              name: workflowStep.name,
              output,
              timestamp: new Date().toISOString(),
            } as MDXLDData,
            content: '',
          })
        }
      } catch (error) {
        // Log error and optionally persist
        console.error(`Error in workflow step ${workflowStep.name}:`, error)
        throw error
      }
    }

    // Return the last step's output
    const lastStep = steps[steps.length - 1]
    return lastStep ? stepOutputs[lastStep.name]?.output : null
  }

  /**
   * Stream workflow execution
   */
  async function* stream(input: unknown): AsyncGenerator<MastraWorkflowEvent> {
    const stepOutputs: Record<string, { output: unknown }> = {}

    for (const workflowStep of steps) {
      // Emit step start event
      yield {
        type: 'step_start',
        step: workflowStep.name,
        state: workflowState,
      }

      const context: MastraWorkflowContext = {
        input,
        steps: stepOutputs,
        agents,
        state: workflowState,
      }

      try {
        const output = await workflowStep.handler(context)
        stepOutputs[workflowStep.name] = { output }

        // Emit step complete event
        yield {
          type: 'step_complete',
          step: workflowStep.name,
          output,
          state: workflowState,
        }

        // Persist state if database is available
        if (database) {
          await database.set(`workflows/${name}/steps/${workflowStep.name}`, {
            type: 'WorkflowStep',
            data: {
              name: workflowStep.name,
              output,
              timestamp: new Date().toISOString(),
            } as MDXLDData,
            content: '',
          })
        }
      } catch (error) {
        // Emit error event
        yield {
          type: 'step_error',
          step: workflowStep.name,
          error: error as Error,
          state: workflowState,
        }
        throw error
      }
    }

    // Emit workflow complete event
    const lastStep = steps[steps.length - 1]
    yield {
      type: 'workflow_complete',
      output: lastStep ? stepOutputs[lastStep.name]?.output : null,
      state: workflowState,
    }
  }

  const workflow: MastraWorkflow = {
    name,
    step,
    parallel,
    branch,
    run,
    stream,
  }

  return workflow
}
