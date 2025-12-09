/**
 * Vapi webhook handling
 */

import type { VapiCall } from './types.js'

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'call.started'
  | 'call.ended'
  | 'transcript.update'
  | 'function.call'
  | 'assistant.request'
  | 'status.update'
  | 'hang'
  | 'speech.started'
  | 'speech.ended'

/**
 * Base webhook event
 */
export interface WebhookEvent {
  type: WebhookEventType
  timestamp: string
  callId: string
}

/**
 * Call start event
 */
export interface CallStartEvent extends WebhookEvent {
  type: 'call.started'
  call: VapiCall
}

/**
 * Call end event
 */
export interface CallEndEvent extends WebhookEvent {
  type: 'call.ended'
  call: VapiCall
  endedReason?: string
  transcript?: Array<{
    role: 'user' | 'assistant' | 'system'
    message: string
    timestamp: string
  }>
  summary?: string
  recordingUrl?: string
}

/**
 * Transcript update event
 */
export interface TranscriptUpdateEvent extends WebhookEvent {
  type: 'transcript.update'
  role: 'user' | 'assistant'
  transcript: string
  transcriptType: 'partial' | 'final'
}

/**
 * Function call event
 */
export interface FunctionCallEvent extends WebhookEvent {
  type: 'function.call'
  functionName: string
  parameters: Record<string, unknown>
  callId: string
}

/**
 * Assistant request event
 */
export interface AssistantRequestEvent extends WebhookEvent {
  type: 'assistant.request'
  phoneNumber?: string
  customer?: {
    number?: string
    name?: string
  }
}

/**
 * Status update event
 */
export interface StatusUpdateEvent extends WebhookEvent {
  type: 'status.update'
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended'
}

/**
 * Webhook handler function
 */
export type WebhookHandler<T extends WebhookEvent = WebhookEvent> = (event: T) => void | Promise<void>

/**
 * Webhook configuration
 */
export interface VapiWebhookConfig {
  /** Secret for webhook signature verification (optional) */
  secret?: string
  /** Handler for call start events */
  onCallStart?: WebhookHandler<CallStartEvent>
  /** Handler for call end events */
  onCallEnd?: WebhookHandler<CallEndEvent>
  /** Handler for transcript updates */
  onTranscript?: WebhookHandler<TranscriptUpdateEvent>
  /** Handler for function calls */
  onFunctionCall?: WebhookHandler<FunctionCallEvent>
  /** Handler for assistant requests */
  onAssistantRequest?: WebhookHandler<AssistantRequestEvent>
  /** Handler for status updates */
  onStatusUpdate?: WebhookHandler<StatusUpdateEvent>
  /** Generic event handler */
  onEvent?: WebhookHandler<WebhookEvent>
}

/**
 * Webhook request body
 */
interface WebhookRequestBody {
  message: {
    type: WebhookEventType
    call?: any
    [key: string]: any
  }
}

/**
 * Vapi webhook handler
 *
 * @example
 * ```ts
 * import { VapiWebhook } from '@mdxai/vapi'
 * import { Hono } from 'hono'
 *
 * const webhook = new VapiWebhook({
 *   secret: process.env.VAPI_WEBHOOK_SECRET,
 *   onCallEnd: async (event) => {
 *     console.log('Call ended:', event.callId)
 *     console.log('Transcript:', event.transcript)
 *   },
 *   onFunctionCall: async (event) => {
 *     console.log('Function called:', event.functionName)
 *     return { result: 'success' }
 *   }
 * })
 *
 * const app = new Hono()
 * app.post('/webhook/vapi', async (c) => {
 *   const body = await c.req.json()
 *   const result = await webhook.handle(body)
 *   return c.json(result)
 * })
 * ```
 */
export class VapiWebhook {
  private config: VapiWebhookConfig

  constructor(config: VapiWebhookConfig) {
    this.config = config
  }

  /**
   * Handle a webhook request
   */
  async handle(body: any): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      // Parse the webhook event
      const event = this.parseEvent(body)

      // Call generic handler if present
      if (this.config.onEvent) {
        await this.config.onEvent(event)
      }

      // Call specific handler based on event type
      let result: any
      switch (event.type) {
        case 'call.started':
          if (this.config.onCallStart) {
            result = await this.config.onCallStart(event as CallStartEvent)
          }
          break

        case 'call.ended':
          if (this.config.onCallEnd) {
            result = await this.config.onCallEnd(event as CallEndEvent)
          }
          break

        case 'transcript.update':
          if (this.config.onTranscript) {
            result = await this.config.onTranscript(event as TranscriptUpdateEvent)
          }
          break

        case 'function.call':
          if (this.config.onFunctionCall) {
            result = await this.config.onFunctionCall(event as FunctionCallEvent)
          }
          break

        case 'assistant.request':
          if (this.config.onAssistantRequest) {
            result = await this.config.onAssistantRequest(event as AssistantRequestEvent)
          }
          break

        case 'status.update':
          if (this.config.onStatusUpdate) {
            result = await this.config.onStatusUpdate(event as StatusUpdateEvent)
          }
          break
      }

      return { success: true, result }
    } catch (error) {
      console.error('Webhook handling error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Parse webhook event from request body
   */
  private parseEvent(body: any): WebhookEvent {
    const message = body.message || body

    const baseEvent: WebhookEvent = {
      type: message.type,
      timestamp: message.timestamp || new Date().toISOString(),
      callId: message.callId || message.call?.id || '',
    }

    // Parse specific event types
    switch (message.type) {
      case 'call.started':
        return {
          ...baseEvent,
          call: message.call,
        } as CallStartEvent

      case 'call.ended':
        return {
          ...baseEvent,
          call: message.call,
          endedReason: message.endedReason || message.call?.endedReason,
          transcript: message.transcript || message.call?.transcript,
          summary: message.summary || message.call?.summary,
          recordingUrl: message.recordingUrl || message.call?.recordingUrl,
        } as CallEndEvent

      case 'transcript.update':
        return {
          ...baseEvent,
          role: message.role,
          transcript: message.transcript,
          transcriptType: message.transcriptType || 'partial',
        } as TranscriptUpdateEvent

      case 'function.call':
        return {
          ...baseEvent,
          functionName: message.functionName || message.function?.name,
          parameters: message.parameters || message.function?.parameters || {},
        } as FunctionCallEvent

      case 'assistant.request':
        return {
          ...baseEvent,
          phoneNumber: message.phoneNumber,
          customer: message.customer,
        } as AssistantRequestEvent

      case 'status.update':
        return {
          ...baseEvent,
          status: message.status,
        } as StatusUpdateEvent

      default:
        return baseEvent
    }
  }

  /**
   * Verify webhook signature (if secret is configured)
   */
  verifySignature(signature: string, body: string): boolean {
    if (!this.config.secret) {
      return true // No secret configured, skip verification
    }

    // TODO: Implement signature verification based on Vapi's specification
    // This would typically use HMAC with the secret
    console.warn('Webhook signature verification not yet implemented')
    return true
  }
}
