/**
 * @mdxai/agentkit - Agent Composition Toolkit
 *
 * Provides tools for building, composing, and managing AI agents in the mdxai ecosystem.
 *
 * Features:
 * - Agent definition and creation
 * - Tool registry for agent capabilities
 * - Agent composition and orchestration
 * - Shared execution context
 * - Lifecycle hooks (onStart, onEnd, onError, etc.)
 *
 * @packageDocumentation
 */

export const name = '@mdxai/agentkit'

import { z } from 'zod'

// =============================================================================
// Types
// =============================================================================

/**
 * Tool definition for agents
 */
export interface Tool<TInput = unknown, TOutput = unknown> {
  /** Tool name */
  name: string
  /** Tool description */
  description: string
  /** Input schema (Zod schema) */
  inputSchema?: z.ZodType<TInput>
  /** Handler function */
  handler: (input: TInput, context: AgentContext) => Promise<TOutput>
}

/**
 * Message in agent conversation
 */
export interface Message {
  /** Message role */
  role: 'user' | 'assistant' | 'system' | 'tool'
  /** Message content */
  content: string
  /** Tool calls (for assistant messages) */
  toolCalls?: ToolCall[]
  /** Tool result (for tool messages) */
  toolResult?: unknown
  /** Tool name (for tool messages) */
  toolName?: string
  /** Timestamp */
  timestamp?: string
}

/**
 * Tool call request
 */
export interface ToolCall {
  /** Tool name */
  name: string
  /** Tool input */
  input: unknown
  /** Call ID */
  id?: string
}

/**
 * Agent state
 */
export interface AgentState {
  /** Conversation history */
  messages: Message[]
  /** Shared state data */
  data: Record<string, unknown>
  /** Current step number */
  step: number
  /** Is the agent running */
  running: boolean
  /** Error if any */
  error?: Error
}

/**
 * Agent context passed to tools and handlers
 */
export interface AgentContext {
  /** Agent ID */
  agentId: string
  /** Current state */
  state: AgentState
  /** Available tools */
  tools: Tool[]
  /** Call a tool */
  call: <TInput = unknown, TOutput = unknown>(toolName: string, input: TInput) => Promise<TOutput>
  /** Send a message */
  send: (message: string | Message) => Promise<void>
  /** Get shared data */
  get: <T = unknown>(key: string) => T | undefined
  /** Set shared data */
  set: (key: string, value: unknown) => void
  /** Log a message */
  log: (message: string, level?: 'info' | 'warn' | 'error') => void
}

/**
 * Lifecycle hook for agents
 */
export type LifecycleHook = (context: AgentContext) => void | Promise<void>

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent ID */
  id: string
  /** Agent name */
  name: string
  /** Agent description */
  description?: string
  /** System instructions */
  instructions?: string
  /** Available tools */
  tools?: readonly Tool[]
  /** Initial state */
  initialState?: Partial<AgentState>
  /** Lifecycle hooks */
  hooks?: {
    /** Called when agent starts */
    onStart?: LifecycleHook
    /** Called when agent stops */
    onStop?: LifecycleHook
    /** Called before each step */
    onBeforeStep?: LifecycleHook
    /** Called after each step */
    onAfterStep?: LifecycleHook
    /** Called on error */
    onError?: (error: Error, context: AgentContext) => void | Promise<void>
    /** Called when a tool is called */
    onToolCall?: (toolName: string, input: unknown, context: AgentContext) => void | Promise<void>
    /** Called when a tool returns */
    onToolResult?: (toolName: string, result: unknown, context: AgentContext) => void | Promise<void>
  }
  /** Maximum number of steps */
  maxSteps?: number
  /** Parent agent (for composed agents) */
  parent?: Agent
}

/**
 * Agent run options
 */
export interface RunOptions {
  /** Input message or messages */
  input: string | Message | Message[]
  /** Maximum steps for this run */
  maxSteps?: number
  /** Additional context data */
  context?: Record<string, unknown>
}

/**
 * Agent run result
 */
export interface RunResult {
  /** Final message from agent */
  message: string
  /** All messages in conversation */
  messages: Message[]
  /** Final state */
  state: AgentState
  /** Number of steps taken */
  steps: number
  /** Whether the run completed successfully */
  success: boolean
  /** Error if any */
  error?: Error
}

/**
 * Agent interface
 */
export interface Agent {
  /** Agent ID */
  id: string
  /** Agent configuration */
  config: AgentConfig
  /** Current state */
  state: AgentState
  /** Tool registry */
  tools: ToolRegistry
  /** Run the agent */
  run: (options: RunOptions) => Promise<RunResult>
  /** Add a tool */
  addTool: <TInput = unknown, TOutput = unknown>(tool: Tool<TInput, TOutput>) => void
  /** Remove a tool */
  removeTool: (name: string) => void
  /** Reset state */
  reset: () => void
  /** Stop the agent */
  stop: () => Promise<void>
  /** Get context */
  getContext: () => AgentContext
}

// =============================================================================
// Tool Registry
// =============================================================================

/**
 * Tool registry for managing agent tools
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a tool
   */
  register<TInput = unknown, TOutput = unknown>(tool: Tool<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool as Tool)
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get all tools
   */
  all(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tool names
   */
  names(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear()
  }

  /**
   * Create a tool
   */
  static createTool<TInput = unknown, TOutput = unknown>(
    name: string,
    description: string,
    handler: (input: TInput, context: AgentContext) => Promise<TOutput>,
    inputSchema?: z.ZodType<TInput>
  ): Tool<TInput, TOutput> {
    return {
      name,
      description,
      inputSchema,
      handler,
    }
  }
}

// =============================================================================
// Agent Creation
// =============================================================================

/**
 * Create an agent
 */
export function createAgent(config: AgentConfig): Agent {
  // Initialize state
  const initialState: AgentState = {
    messages: [],
    data: {},
    step: 0,
    running: false,
    ...config.initialState,
  }

  let state = { ...initialState }

  // Initialize tool registry
  const toolRegistry = new ToolRegistry()
  if (config.tools) {
    config.tools.forEach((tool) => toolRegistry.register(tool))
  }

  // Create context factory
  const createContext = (): AgentContext => {
    return {
      agentId: config.id,
      state,
      tools: toolRegistry.all(),
      call: async <TInput = unknown, TOutput = unknown>(toolName: string, input: TInput): Promise<TOutput> => {
        const tool = toolRegistry.get(toolName)
        if (!tool) {
          throw new Error(`Tool "${toolName}" not found`)
        }

        // Call lifecycle hook
        if (config.hooks?.onToolCall) {
          await config.hooks.onToolCall(toolName, input, createContext())
        }

        try {
          // Validate input if schema provided
          if (tool.inputSchema) {
            tool.inputSchema.parse(input)
          }

          // Call tool handler
          const result = await tool.handler(input, createContext())

          // Call lifecycle hook
          if (config.hooks?.onToolResult) {
            await config.hooks.onToolResult(toolName, result, createContext())
          }

          return result as TOutput
        } catch (error) {
          if (config.hooks?.onError) {
            await config.hooks.onError(error as Error, createContext())
          }
          throw error
        }
      },
      send: async (message: string | Message) => {
        const msg: Message =
          typeof message === 'string'
            ? {
                role: 'assistant',
                content: message,
                timestamp: new Date().toISOString(),
              }
            : message
        state.messages.push(msg)
      },
      get: <T = unknown>(key: string): T | undefined => {
        return state.data[key] as T | undefined
      },
      set: (key: string, value: unknown) => {
        state.data[key] = value
      },
      log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
        const prefix = level.toUpperCase()
        console.log(`[${prefix}] [${config.id}] ${message}`)
      },
    }
  }

  // Agent implementation
  const agent: Agent = {
    id: config.id,
    config,
    state,
    tools: toolRegistry,

    async run(options: RunOptions): Promise<RunResult> {
      // Normalize input
      const inputMessages: Message[] = Array.isArray(options.input)
        ? options.input
        : [
            typeof options.input === 'string'
              ? { role: 'user' as const, content: options.input, timestamp: new Date().toISOString() }
              : options.input,
          ]

      // Add input messages to state
      state.messages.push(...inputMessages)

      // Merge context data
      if (options.context) {
        state.data = { ...state.data, ...options.context }
      }

      // Mark as running
      state.running = true
      state.step = 0
      state.error = undefined

      const maxSteps = options.maxSteps ?? config.maxSteps ?? 10

      try {
        // Call onStart hook
        if (config.hooks?.onStart) {
          await config.hooks.onStart(createContext())
        }

        // Main execution loop
        while (state.running && state.step < maxSteps) {
          state.step++

          // Call onBeforeStep hook
          if (config.hooks?.onBeforeStep) {
            await config.hooks.onBeforeStep(createContext())
          }

          // This is a simplified execution model
          // In a real implementation, you would integrate with an LLM
          // For now, we just process one step and stop
          state.running = false

          // Call onAfterStep hook
          if (config.hooks?.onAfterStep) {
            await config.hooks.onAfterStep(createContext())
          }
        }

        // Call onStop hook
        if (config.hooks?.onStop) {
          await config.hooks.onStop(createContext())
        }

        const lastMessage = state.messages[state.messages.length - 1]

        return {
          message: lastMessage?.content ?? '',
          messages: state.messages,
          state,
          steps: state.step,
          success: true,
        }
      } catch (error) {
        state.error = error as Error
        state.running = false

        // Call onError hook
        if (config.hooks?.onError) {
          await config.hooks.onError(error as Error, createContext())
        }

        return {
          message: '',
          messages: state.messages,
          state,
          steps: state.step,
          success: false,
          error: error as Error,
        }
      }
    },

    addTool<TInput = unknown, TOutput = unknown>(tool: Tool<TInput, TOutput>): void {
      toolRegistry.register(tool)
    },

    removeTool(name: string): void {
      toolRegistry.unregister(name)
    },

    reset(): void {
      state = { ...initialState }
    },

    async stop(): Promise<void> {
      state.running = false
      if (config.hooks?.onStop) {
        await config.hooks.onStop(createContext())
      }
    },

    getContext(): AgentContext {
      return createContext()
    },
  }

  return agent
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a tool from a function
 */
export function createTool<TInput = unknown, TOutput = unknown>(
  name: string,
  description: string,
  handler: (input: TInput, context: AgentContext) => Promise<TOutput>,
  inputSchema?: z.ZodType<TInput>
): Tool<TInput, TOutput> {
  return ToolRegistry.createTool(name, description, handler, inputSchema)
}

/**
 * Create a simple echo tool for testing
 */
export function createEchoTool(): Tool<{ message: string }, string> {
  return createTool(
    'echo',
    'Echo back the input message',
    async (input) => {
      return input.message
    },
    z.object({
      message: z.string().describe('Message to echo'),
    })
  )
}

/**
 * Create a tool that delegates to another agent
 */
export function createAgentTool(agent: Agent): Tool<{ message: string }, string> {
  return createTool(
    `agent_${agent.id}`,
    `Run agent: ${agent.config.name}`,
    async (input) => {
      const result = await agent.run({ input: input.message })
      return result.message
    },
    z.object({
      message: z.string().describe('Input message for the agent'),
    })
  )
}

// =============================================================================
// Agent Composition
// =============================================================================

/**
 * Compose multiple agents into a single orchestrator agent
 */
export function composeAgents(
  id: string,
  agents: Agent[],
  options?: {
    /** Orchestrator instructions */
    instructions?: string
    /** How to select which agent to use */
    strategy?: 'sequential' | 'parallel' | 'router'
    /** Router function (for router strategy) */
    router?: (input: string, agents: Agent[]) => Promise<Agent>
  }
): Agent {
  const strategy = options?.strategy ?? 'sequential'

  // Create orchestrator agent
  return createAgent({
    id,
    name: `Orchestrator: ${id}`,
    description: `Orchestrates ${agents.length} agents`,
    instructions: options?.instructions,
    tools: agents.map((agent) =>
      createTool(
        `run_${agent.id}`,
        `Run agent: ${agent.config.name}`,
        async (input: { message: string }, context: AgentContext) => {
          const result = await agent.run({ input: input.message })
          return result.message
        }
      )
    ) as Tool[],
    hooks: {
      async onStart(context) {
        context.log('Starting orchestrator with strategy: ' + strategy)
      },
    },
  })
}

/**
 * Create a delegating agent that can hand off to other agents
 */
export function createDelegatingAgent(
  id: string,
  delegates: Record<string, Agent>,
  options?: {
    /** Instructions for the delegating agent */
    instructions?: string
    /** Default delegate to use */
    defaultDelegate?: string
  }
): Agent {
  return createAgent({
    id,
    name: `Delegating Agent: ${id}`,
    description: `Delegates to ${Object.keys(delegates).length} agents`,
    instructions: options?.instructions,
    tools: Object.entries(delegates).map(([name, agent]) =>
      createTool(
        `delegate_to_${name}`,
        `Delegate to ${agent.config.name}`,
        async (input: { message: string }, context: AgentContext) => {
          const result = await agent.run({ input: input.message })
          return result.message
        }
      )
    ) as Tool[],
  })
}

// =============================================================================
// Execution Context
// =============================================================================

/**
 * Shared execution context for multiple agents
 */
export class ExecutionContext {
  private data: Map<string, unknown> = new Map()
  private agents: Map<string, Agent> = new Map()

  /**
   * Register an agent
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent)
  }

  /**
   * Get an agent
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id)
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Set shared data
   */
  set(key: string, value: unknown): void {
    this.data.set(key, value)
  }

  /**
   * Get shared data
   */
  get<T = unknown>(key: string): T | undefined {
    return this.data.get(key) as T | undefined
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.data.has(key)
  }

  /**
   * Delete a key
   */
  delete(key: string): boolean {
    return this.data.delete(key)
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear()
  }

  /**
   * Run an agent with shared context
   */
  async runAgent(agentId: string, input: string | Message | Message[]): Promise<RunResult> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in execution context`)
    }

    // Inject shared context data into agent
    const contextData = Object.fromEntries(this.data.entries())
    const result = await agent.run({ input, context: contextData })

    // Extract and store any updated context data
    Object.entries(result.state.data).forEach(([key, value]) => {
      this.data.set(key, value)
    })

    return result
  }
}
