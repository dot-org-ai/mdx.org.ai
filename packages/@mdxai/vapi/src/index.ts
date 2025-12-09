/**
 * @mdxai/vapi - Vapi voice AI integration for MDX
 *
 * Provides voice AI capabilities including:
 * - Voice agent creation and management
 * - Phone integration (inbound/outbound calls)
 * - WebRTC support for browser-based voice
 * - Transcription and voice synthesis
 * - Call handling (transfer, hold, control)
 *
 * @packageDocumentation
 */

export const name = '@mdxai/vapi'

// Core client and types
export { VapiClient } from './client.js'
export { VapiAgent } from './agent.js'
export { VapiWebhook } from './webhook.js'

// Types
export type {
  VapiClientConfig,
  VapiAssistant,
  VapiCall,
  VapiPhoneNumber,
  CreateAssistantOptions,
  CreateCallOptions,
  ListCallsOptions,
  UpdateAssistantOptions,
} from './types.js'

export type {
  VapiAgentConfig,
  VoiceAgentDocument,
  CallSession,
  WebSession,
  TranscriptEvent,
  ResponseEvent,
  CallEvent,
} from './agent.js'

export type {
  VapiWebhookConfig,
  WebhookEvent,
  CallStartEvent,
  CallEndEvent,
  TranscriptUpdateEvent,
  FunctionCallEvent,
  WebhookHandler,
} from './webhook.js'

// Re-export Vapi SDK types for convenience
export type { VapiClient as VapiSDKClient } from '@vapi-ai/server-sdk'

// Utilities
export { createVapiTools } from './tools.js'
export type { VapiTool } from './tools.js'
