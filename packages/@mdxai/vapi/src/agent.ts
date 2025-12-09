/**
 * Vapi voice agent with MDX integration
 */

import type { MDXLDDocument } from 'mdxld'
import type { VapiClient } from './client.js'
import type { VapiAssistant, CreateAssistantOptions } from './types.js'

/**
 * Voice agent document type
 */
export interface VoiceAgentDocument extends MDXLDDocument {
  data: {
    $type: 'VoiceAgent'
    name: string
    voice?: string | { provider: string; voiceId: string }
    language?: string
    firstMessage?: string
    model?: string | { provider: string; model: string }
    functions?: Array<{ name: string; description?: string; parameters?: Record<string, unknown> }>
    endCallMessage?: string
    endCallPhrases?: string[]
    backgroundSound?: 'off' | 'office' | 'white-noise'
    recordingEnabled?: boolean
    metadata?: Record<string, unknown>
  }
  content: string // Instructions/system prompt
}

/**
 * Vapi agent configuration
 */
export interface VapiAgentConfig {
  /** Vapi client instance */
  client: VapiClient
  /** MDX document defining the voice agent */
  document: VoiceAgentDocument
  /** Override assistant ID (if already created) */
  assistantId?: string
}

/**
 * Call session
 */
export interface CallSession {
  /** Call ID */
  id: string
  /** Status */
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended'
  /** Phone number */
  phoneNumber?: string
  /** Start time */
  startedAt?: Date
  /** End time */
  endedAt?: Date
  /** Duration in seconds */
  duration?: number
  /** Transcript */
  transcript: Array<{ role: 'user' | 'assistant'; message: string; timestamp: Date }>
}

/**
 * Web session (WebRTC)
 */
export interface WebSession {
  /** Session ID */
  id: string
  /** Connection status */
  connected: boolean
  /** Listening status */
  listening: boolean
  /** Muted status */
  muted: boolean
  /** Transcript */
  transcript: Array<{ role: 'user' | 'assistant'; message: string; timestamp: Date }>
  /** Connect to voice session */
  connect: () => Promise<void>
  /** Disconnect from voice session */
  disconnect: () => void
  /** Mute microphone */
  mute: () => void
  /** Unmute microphone */
  unmute: () => void
  /** Send a message */
  say: (message: string) => Promise<void>
}

/**
 * Transcript event
 */
export interface TranscriptEvent {
  role: 'user' | 'assistant'
  message: string
  timestamp: Date
}

/**
 * Response event
 */
export interface ResponseEvent {
  message: string
  timestamp: Date
}

/**
 * Call event
 */
export interface CallEvent {
  type: 'start' | 'end' | 'error'
  callId?: string
  error?: string
  timestamp: Date
}

/**
 * Event handler function
 */
type EventHandler<T> = (event: T) => void | Promise<void>

/**
 * Vapi voice agent with MDX integration
 *
 * @example
 * ```ts
 * import { VapiClient, VapiAgent } from '@mdxai/vapi'
 * import { parse } from 'mdxld'
 *
 * const client = new VapiClient({ apiKey: process.env.VAPI_API_KEY })
 *
 * const agentDoc = parse(`---
 * $type: VoiceAgent
 * name: CustomerSupport
 * voice: alloy
 * firstMessage: Hello! How can I help you?
 * ---
 *
 * You are a friendly customer support agent.
 * `)
 *
 * const agent = new VapiAgent({ client, document: agentDoc })
 *
 * // Initialize the agent (creates assistant)
 * await agent.initialize()
 *
 * // Make an outbound call
 * const call = await agent.call('+1234567890')
 *
 * // Listen to events
 * agent.on('transcript', (event) => {
 *   console.log(`${event.role}: ${event.message}`)
 * })
 * ```
 */
export class VapiAgent {
  private client: VapiClient
  private document: VoiceAgentDocument
  private assistantId?: string
  private assistant?: VapiAssistant
  private eventHandlers: Map<string, Set<EventHandler<any>>> = new Map()

  constructor(config: VapiAgentConfig) {
    this.client = config.client
    this.document = config.document
    this.assistantId = config.assistantId
  }

  /**
   * Initialize the agent (create or retrieve assistant)
   */
  async initialize(): Promise<VapiAssistant> {
    if (this.assistant) {
      return this.assistant
    }

    // If assistant ID provided, retrieve it
    if (this.assistantId) {
      const existing = await this.client.getAssistant(this.assistantId)
      if (existing) {
        this.assistant = existing
        return existing
      }
    }

    // Create assistant from document
    const options = this.documentToAssistantOptions()
    this.assistant = await this.client.createAssistant(options)
    this.assistantId = this.assistant.id

    return this.assistant
  }

  /**
   * Convert MDX document to assistant creation options
   */
  private documentToAssistantOptions(): CreateAssistantOptions {
    const { data, content } = this.document

    // Parse voice configuration
    let voice: CreateAssistantOptions['voice']
    if (data.voice) {
      if (typeof data.voice === 'string') {
        voice = { provider: '11labs', voiceId: data.voice }
      } else {
        voice = data.voice as any
      }
    }

    // Parse model configuration
    let model: CreateAssistantOptions['model']
    if (data.model) {
      if (typeof data.model === 'string') {
        model = { provider: 'openai', model: data.model }
      } else {
        model = data.model as any
      }
    }

    return {
      name: data.name,
      instructions: content,
      firstMessage: data.firstMessage,
      voice,
      model,
      functions: data.functions,
      endCallMessage: data.endCallMessage,
      endCallPhrases: data.endCallPhrases,
      backgroundSound: data.backgroundSound,
      recordingEnabled: data.recordingEnabled,
      metadata: data.metadata,
    }
  }

  /**
   * Make an outbound phone call
   */
  async call(phoneNumber: string, metadata?: Record<string, unknown>): Promise<CallSession> {
    await this.initialize()

    const call = await this.client.createCall({
      assistantId: this.assistantId,
      phoneNumber,
      metadata,
    })

    const session: CallSession = {
      id: call.id,
      status: call.status,
      phoneNumber: call.phoneNumber,
      startedAt: call.startedAt ? new Date(call.startedAt) : undefined,
      endedAt: call.endedAt ? new Date(call.endedAt) : undefined,
      duration: call.duration,
      transcript: (call.transcript || []).map((t) => ({
        role: t.role === 'user' || t.role === 'assistant' ? t.role : 'assistant',
        message: t.message,
        timestamp: new Date(t.timestamp),
      })),
    }

    // Emit call start event
    this.emit('call', {
      type: 'start',
      callId: call.id,
      timestamp: new Date(),
    })

    return session
  }

  /**
   * Start a web session (WebRTC)
   *
   * Note: This returns a session object that must be used in a browser context
   * with the @vapi-ai/web SDK
   */
  async startWebSession(): Promise<WebSession> {
    await this.initialize()

    const transcript: Array<{ role: 'user' | 'assistant'; message: string; timestamp: Date }> = []

    const session: WebSession = {
      id: `web-${Date.now()}`,
      connected: false,
      listening: false,
      muted: false,
      transcript,
      connect: async () => {
        // Note: Actual WebRTC connection happens in browser
        // This is a placeholder for the API contract
        session.connected = true
        this.emit('call', {
          type: 'start',
          callId: session.id,
          timestamp: new Date(),
        })
      },
      disconnect: () => {
        session.connected = false
        session.listening = false
        this.emit('call', {
          type: 'end',
          callId: session.id,
          timestamp: new Date(),
        })
      },
      mute: () => {
        session.muted = true
      },
      unmute: () => {
        session.muted = false
      },
      say: async (message: string) => {
        const event: TranscriptEvent = {
          role: 'assistant',
          message,
          timestamp: new Date(),
        }
        transcript.push(event)
        this.emit('response', { message, timestamp: new Date() })
      },
    }

    return session
  }

  /**
   * Get the assistant configuration
   */
  getAssistant(): VapiAssistant | undefined {
    return this.assistant
  }

  /**
   * Get the assistant ID
   */
  getAssistantId(): string | undefined {
    return this.assistantId
  }

  /**
   * Update the agent's assistant
   */
  async update(options: Partial<CreateAssistantOptions>): Promise<VapiAssistant> {
    if (!this.assistantId) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    this.assistant = await this.client.updateAssistant(this.assistantId, options)
    return this.assistant
  }

  /**
   * Register an event handler
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * Unregister an event handler
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Emit an event
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          const result = handler(data)
          if (result instanceof Promise) {
            result.catch((error) => {
              console.error(`Error in ${event} handler:`, error)
            })
          }
        } catch (error) {
          console.error(`Error in ${event} handler:`, error)
        }
      }
    }
  }
}
