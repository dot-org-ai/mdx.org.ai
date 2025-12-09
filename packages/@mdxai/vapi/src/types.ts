/**
 * Type definitions for Vapi voice AI integration
 */

import type { Vapi } from '@vapi-ai/server-sdk'

/**
 * Vapi client configuration
 */
export interface VapiClientConfig {
  /** Vapi API key (server-side operations) */
  apiKey?: string
  /** Vapi public key (client-side WebRTC) */
  publicKey?: string
  /** Base URL for Vapi API (optional, defaults to Vapi's production API) */
  baseUrl?: string
  /** Timeout for API requests in milliseconds */
  timeout?: number
}

/**
 * Vapi assistant configuration
 */
export interface VapiAssistant {
  /** Unique identifier */
  id?: string
  /** Assistant name */
  name: string
  /** System prompt/instructions */
  instructions?: string
  /** First message to greet users */
  firstMessage?: string
  /** Model configuration */
  model?: {
    provider: 'openai' | 'anthropic' | 'groq' | 'together-ai' | 'custom'
    model: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
  }
  /** Voice configuration */
  voice?: {
    provider: '11labs' | 'playht' | 'deepgram' | 'azure' | 'custom'
    voiceId: string
    speed?: number
    stability?: number
    similarityBoost?: number
  }
  /** Transcriber configuration */
  transcriber?: {
    provider: 'deepgram' | 'gladia' | 'custom'
    model?: string
    language?: string
    keywords?: string[]
  }
  /** Functions/tools the assistant can call */
  functions?: Array<{
    name: string
    description?: string
    parameters?: Record<string, unknown>
    url?: string
  }>
  /** End call configuration */
  endCallMessage?: string
  endCallPhrases?: string[]
  /** Background sound configuration */
  backgroundSound?: 'off' | 'office' | 'white-noise'
  /** Recording enabled */
  recordingEnabled?: boolean
  /** Voicemail detection */
  voicemailDetection?: {
    enabled: boolean
    machineDetectionTimeout?: number
  }
  /** Metadata */
  metadata?: Record<string, unknown>
  /** Created timestamp */
  createdAt?: string
  /** Updated timestamp */
  updatedAt?: string
}

/**
 * Vapi call information
 */
export interface VapiCall {
  /** Unique identifier */
  id: string
  /** Assistant ID used for this call */
  assistantId?: string
  /** Phone number called from/to */
  phoneNumber?: string
  /** Customer phone number */
  customer?: {
    number?: string
    name?: string
    extension?: string
  }
  /** Call type */
  type: 'inbound' | 'outbound' | 'web'
  /** Call status */
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended'
  /** Start time */
  startedAt?: string
  /** End time */
  endedAt?: string
  /** Duration in seconds */
  duration?: number
  /** Call cost */
  cost?: number
  /** Transcript */
  transcript?: Array<{
    role: 'user' | 'assistant' | 'system'
    message: string
    timestamp: string
  }>
  /** Recording URL */
  recordingUrl?: string
  /** Summary */
  summary?: string
  /** End reason */
  endedReason?:
    | 'customer-hung-up'
    | 'assistant-hung-up'
    | 'assistant-forwarded-call'
    | 'assistant-join-timed-out'
    | 'exceeded-max-duration'
    | 'pipeline-error'
  /** Error message if call failed */
  error?: string
  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Vapi phone number
 */
export interface VapiPhoneNumber {
  /** Unique identifier */
  id: string
  /** Phone number in E.164 format */
  number: string
  /** Assistant ID to use for inbound calls */
  assistantId?: string
  /** Name/label for the phone number */
  name?: string
  /** Provider (Twilio, Vonage, etc.) */
  provider?: string
  /** Created timestamp */
  createdAt?: string
}

/**
 * Options for creating an assistant
 */
export interface CreateAssistantOptions extends Omit<VapiAssistant, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * Options for updating an assistant
 */
export interface UpdateAssistantOptions extends Partial<Omit<VapiAssistant, 'id' | 'createdAt' | 'updatedAt'>> {}

/**
 * Options for creating a call
 */
export interface CreateCallOptions {
  /** Assistant to use for the call */
  assistantId?: string
  /** Inline assistant configuration (instead of assistantId) */
  assistant?: CreateAssistantOptions
  /** Phone number to call (for outbound calls) */
  phoneNumber?: string
  /** Customer information */
  customer?: {
    number?: string
    name?: string
    extension?: string
  }
  /** Metadata */
  metadata?: Record<string, unknown>
  /** Schedule the call for a future time */
  scheduledAt?: string
}

/**
 * Options for listing calls
 */
export interface ListCallsOptions {
  /** Filter by assistant ID */
  assistantId?: string
  /** Limit number of results */
  limit?: number
  /** Pagination cursor */
  cursor?: string
  /** Created after timestamp */
  createdAtGt?: string
  /** Created before timestamp */
  createdAtLt?: string
}

/**
 * Voice configuration presets
 */
export const VoicePresets = {
  // 11labs voices
  alloy: { provider: '11labs' as const, voiceId: 'alloy' },
  echo: { provider: '11labs' as const, voiceId: 'echo' },
  fable: { provider: '11labs' as const, voiceId: 'fable' },
  onyx: { provider: '11labs' as const, voiceId: 'onyx' },
  nova: { provider: '11labs' as const, voiceId: 'nova' },
  shimmer: { provider: '11labs' as const, voiceId: 'shimmer' },
} as const

/**
 * Model presets
 */
export const ModelPresets = {
  'gpt-4': { provider: 'openai' as const, model: 'gpt-4' },
  'gpt-4-turbo': { provider: 'openai' as const, model: 'gpt-4-turbo-preview' },
  'gpt-3.5-turbo': { provider: 'openai' as const, model: 'gpt-3.5-turbo' },
  'claude-3-opus': { provider: 'anthropic' as const, model: 'claude-3-opus-20240229' },
  'claude-3-sonnet': { provider: 'anthropic' as const, model: 'claude-3-sonnet-20240229' },
  'llama-3-70b': { provider: 'groq' as const, model: 'llama3-70b-8192' },
} as const
