/**
 * Primitives Integration Tests
 *
 * Tests for the newly integrated primitives:
 * - ai-providers
 * - ai-experiments
 * - autonomous-agents
 * - digital-workers
 * - human-in-the-loop
 * - services-as-software
 * - language-models
 */

import { describe, it, expect } from 'vitest'

describe('AI Providers', () => {
  it('should export ai-providers functions', async () => {
    const { createRegistry, getRegistry, configureRegistry, model, embeddingModel, DIRECT_PROVIDERS } = await import(
      './index.js'
    )

    expect(createRegistry).toBeDefined()
    expect(getRegistry).toBeDefined()
    expect(configureRegistry).toBeDefined()
    expect(model).toBeDefined()
    expect(embeddingModel).toBeDefined()
    expect(DIRECT_PROVIDERS).toBeDefined()
  })
})

describe('AI Experiments', () => {
  it('should export ai-experiments functions', async () => {
    const {
      Experiment,
      createVariantsFromGrid,
      cartesian,
      cartesianFilter,
      cartesianSample,
      cartesianCount,
      cartesianWithLabels,
      decideExperiment,
      decideWeighted,
      decideEpsilonGreedy,
      decideThompsonSampling,
      decideUCB,
      trackExperiment,
      flush,
      configureTracking,
      getTrackingConfig,
      createConsoleBackend,
      createMemoryBackend,
      createBatchBackend,
      createFileBackend,
    } = await import('./index.js')

    expect(Experiment).toBeDefined()
    expect(createVariantsFromGrid).toBeDefined()
    expect(cartesian).toBeDefined()
    expect(cartesianFilter).toBeDefined()
    expect(cartesianSample).toBeDefined()
    expect(cartesianCount).toBeDefined()
    expect(cartesianWithLabels).toBeDefined()
    expect(decideExperiment).toBeDefined()
    expect(decideWeighted).toBeDefined()
    expect(decideEpsilonGreedy).toBeDefined()
    expect(decideThompsonSampling).toBeDefined()
    expect(decideUCB).toBeDefined()
    expect(trackExperiment).toBeDefined()
    expect(flush).toBeDefined()
    expect(configureTracking).toBeDefined()
    expect(getTrackingConfig).toBeDefined()
    expect(createConsoleBackend).toBeDefined()
    expect(createMemoryBackend).toBeDefined()
    expect(createBatchBackend).toBeDefined()
    expect(createFileBackend).toBeDefined()
  })

  it('should work with cartesian product', () => {
    const { cartesian } = require('./index.js')

    const result = cartesian({ a: [1, 2], b: ['x', 'y'] })
    expect(result).toHaveLength(4)
    expect(result).toContainEqual({ a: 1, b: 'x' })
    expect(result).toContainEqual({ a: 1, b: 'y' })
    expect(result).toContainEqual({ a: 2, b: 'x' })
    expect(result).toContainEqual({ a: 2, b: 'y' })
  })
})

describe('Autonomous Agents', () => {
  it('should export autonomous-agents functions', async () => {
    const {
      Agent,
      AgentRole,
      Roles,
      hasPermission,
      hasSkill,
      getPermissions,
      getSkills,
      mergeRoles,
      AgentTeam,
      createTeamMember,
      teamMemberFromAgent,
      calculateTeamCapacity,
      getTeamSkills,
      teamHasSkill,
      findBestMemberForTask,
      AgentGoals,
      createGoal,
      createGoalWithSubgoals,
      isGoalOverdue,
      getOverdueGoals,
      getGoalsDueSoon,
      getGoalsByStatus,
      getTimeRemaining,
      agentDo,
      doAction,
      agentAsk,
      agentDecide,
      agentApprove,
      agentGenerate,
      agentIs,
      agentNotify,
      agentKpi,
      agentKpis,
      agentOkr,
      agentOkrs,
      createKeyResult,
      updateKeyResultStatus,
    } = await import('./index.js')

    expect(Agent).toBeDefined()
    expect(AgentRole).toBeDefined()
    expect(Roles).toBeDefined()
    expect(hasPermission).toBeDefined()
    expect(hasSkill).toBeDefined()
    expect(getPermissions).toBeDefined()
    expect(getSkills).toBeDefined()
    expect(mergeRoles).toBeDefined()
    expect(AgentTeam).toBeDefined()
    expect(createTeamMember).toBeDefined()
    expect(teamMemberFromAgent).toBeDefined()
    expect(calculateTeamCapacity).toBeDefined()
    expect(getTeamSkills).toBeDefined()
    expect(teamHasSkill).toBeDefined()
    expect(findBestMemberForTask).toBeDefined()
    expect(AgentGoals).toBeDefined()
    expect(createGoal).toBeDefined()
    expect(createGoalWithSubgoals).toBeDefined()
    expect(isGoalOverdue).toBeDefined()
    expect(getOverdueGoals).toBeDefined()
    expect(getGoalsDueSoon).toBeDefined()
    expect(getGoalsByStatus).toBeDefined()
    expect(getTimeRemaining).toBeDefined()
    expect(agentDo).toBeDefined()
    expect(doAction).toBeDefined()
    expect(agentAsk).toBeDefined()
    expect(agentDecide).toBeDefined()
    expect(agentApprove).toBeDefined()
    expect(agentGenerate).toBeDefined()
    expect(agentIs).toBeDefined()
    expect(agentNotify).toBeDefined()
    expect(agentKpi).toBeDefined()
    expect(agentKpis).toBeDefined()
    expect(agentOkr).toBeDefined()
    expect(agentOkrs).toBeDefined()
    expect(createKeyResult).toBeDefined()
    expect(updateKeyResultStatus).toBeDefined()
  })
})

describe('Digital Workers', () => {
  it('should export digital-workers functions', async () => {
    const {
      DigitalWorkerRole,
      DigitalWorkerTeam,
      DigitalWorkerGoals,
      workerApprove,
      workerAsk,
      workerDo,
      workerDecide,
      workerGenerate,
      workerIs,
      workerNotify,
      workerKpis,
      workerOkrs,
    } = await import('./index.js')

    expect(DigitalWorkerRole).toBeDefined()
    expect(DigitalWorkerTeam).toBeDefined()
    expect(DigitalWorkerGoals).toBeDefined()
    expect(workerApprove).toBeDefined()
    expect(workerAsk).toBeDefined()
    expect(workerDo).toBeDefined()
    expect(workerDecide).toBeDefined()
    expect(workerGenerate).toBeDefined()
    expect(workerIs).toBeDefined()
    expect(workerNotify).toBeDefined()
    expect(workerKpis).toBeDefined()
    expect(workerOkrs).toBeDefined()
  })
})

describe('Human in the Loop', () => {
  it('should export human-in-the-loop functions', async () => {
    const {
      Human,
      HumanManager,
      HumanRole,
      HumanTeam,
      HumanGoals,
      humanApprove,
      humanAsk,
      humanDo,
      humanDecide,
      humanGenerate,
      humanIs,
      humanNotify,
      humanKpis,
      humanOkrs,
      registerHuman,
      getDefaultHuman,
      InMemoryHumanStore,
    } = await import('./index.js')

    expect(Human).toBeDefined()
    expect(HumanManager).toBeDefined()
    expect(HumanRole).toBeDefined()
    expect(HumanTeam).toBeDefined()
    expect(HumanGoals).toBeDefined()
    expect(humanApprove).toBeDefined()
    expect(humanAsk).toBeDefined()
    expect(humanDo).toBeDefined()
    expect(humanDecide).toBeDefined()
    expect(humanGenerate).toBeDefined()
    expect(humanIs).toBeDefined()
    expect(humanNotify).toBeDefined()
    expect(humanKpis).toBeDefined()
    expect(humanOkrs).toBeDefined()
    expect(registerHuman).toBeDefined()
    expect(getDefaultHuman).toBeDefined()
    expect(InMemoryHumanStore).toBeDefined()
  })
})

describe('Services as Software', () => {
  it('should export services-as-software functions', async () => {
    const {
      Service,
      Endpoint,
      GET,
      POST,
      PUT,
      DELETE,
      PATCH,
      ServiceClient,
      ServiceProvider,
      providers,
      serviceAsk,
      deliver,
      serviceDo,
      serviceGenerate,
      serviceIs,
      serviceNotify,
      serviceOn,
      order,
      queue,
      quote,
      subscribe,
      serviceEvery,
      entitlements,
      serviceKpis,
      serviceOkrs,
      Plan,
      ServiceKPI,
      ServiceOKR,
      Entitlement,
    } = await import('./index.js')

    expect(Service).toBeDefined()
    expect(Endpoint).toBeDefined()
    expect(GET).toBeDefined()
    expect(POST).toBeDefined()
    expect(PUT).toBeDefined()
    expect(DELETE).toBeDefined()
    expect(PATCH).toBeDefined()
    expect(ServiceClient).toBeDefined()
    expect(ServiceProvider).toBeDefined()
    expect(providers).toBeDefined()
    expect(serviceAsk).toBeDefined()
    expect(deliver).toBeDefined()
    expect(serviceDo).toBeDefined()
    expect(serviceGenerate).toBeDefined()
    expect(serviceIs).toBeDefined()
    expect(serviceNotify).toBeDefined()
    expect(serviceOn).toBeDefined()
    expect(order).toBeDefined()
    expect(queue).toBeDefined()
    expect(quote).toBeDefined()
    expect(subscribe).toBeDefined()
    expect(serviceEvery).toBeDefined()
    expect(entitlements).toBeDefined()
    expect(serviceKpis).toBeDefined()
    expect(serviceOkrs).toBeDefined()
    expect(Plan).toBeDefined()
    expect(ServiceKPI).toBeDefined()
    expect(ServiceOKR).toBeDefined()
    expect(Entitlement).toBeDefined()
  })
})

describe('Language Models', () => {
  it('should export language-models functions', async () => {
    const {
      resolveModel,
      resolveWithProvider,
      listModels,
      getModel,
      searchModels,
      MODEL_DIRECT_PROVIDERS,
      MODEL_ALIASES,
    } = await import('./index.js')

    expect(resolveModel).toBeDefined()
    expect(resolveWithProvider).toBeDefined()
    expect(listModels).toBeDefined()
    expect(getModel).toBeDefined()
    expect(searchModels).toBeDefined()
    expect(MODEL_DIRECT_PROVIDERS).toBeDefined()
    expect(MODEL_ALIASES).toBeDefined()
  })

  it('should list models', () => {
    const { listModels } = require('./index.js')
    const models = listModels()
    expect(Array.isArray(models)).toBe(true)
    expect(models.length).toBeGreaterThan(0)
  })

  it('should search models', () => {
    const { searchModels } = require('./index.js')
    const claudeModels = searchModels('claude')
    expect(Array.isArray(claudeModels)).toBe(true)
    expect(claudeModels.length).toBeGreaterThan(0)
    expect(claudeModels.every((m) => m.id.toLowerCase().includes('claude'))).toBe(true)
  })

  it('should resolve model aliases', () => {
    const { resolveModel } = require('./index.js')
    const resolved = resolveModel('sonnet')
    expect(resolved).toBeDefined()
    expect(resolved.id).toContain('claude')
  })
})

describe('Helper Factories', () => {
  it('should export helper factory functions', async () => {
    const { createAgentContext, createServiceContext, createExperimentContext, createModelContext } = await import(
      './index.js'
    )

    expect(createAgentContext).toBeDefined()
    expect(createServiceContext).toBeDefined()
    expect(createExperimentContext).toBeDefined()
    expect(createModelContext).toBeDefined()
  })

  it('should create experiment context', () => {
    const { createExperimentContext } = require('./index.js')
    const ctx = createExperimentContext({ name: 'test' })

    expect(ctx.Experiment).toBeDefined()
    expect(ctx.decide).toBeDefined()
    expect(ctx.track).toBeDefined()
    expect(ctx.cartesian).toBeDefined()
  })

  it('should create model context', () => {
    const { createModelContext } = require('./index.js')
    const ctx = createModelContext()

    expect(ctx.model).toBeDefined()
    expect(ctx.list).toBeDefined()
    expect(ctx.search).toBeDefined()
    expect(ctx.resolve).toBeDefined()
  })

  it('should use model context to search models', () => {
    const { createModelContext } = require('./index.js')
    const ctx = createModelContext()

    const models = ctx.list()
    expect(Array.isArray(models)).toBe(true)
    expect(models.length).toBeGreaterThan(0)

    const gptModels = ctx.search('gpt')
    expect(Array.isArray(gptModels)).toBe(true)
    expect(gptModels.every((m) => m.id.toLowerCase().includes('gpt'))).toBe(true)
  })
})

describe('Type Exports', () => {
  it('should export types without errors', async () => {
    // This test will fail to compile if types are not properly exported
    const module = await import('./index.js')

    // Just verify the module loaded successfully
    expect(module).toBeDefined()
  })
})
