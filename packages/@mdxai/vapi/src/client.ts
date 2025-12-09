/**
 * Vapi client for server-side operations
 */

import { VapiClient as VapiSDK } from '@vapi-ai/server-sdk'
import type {
  VapiClientConfig,
  VapiAssistant,
  VapiCall,
  VapiPhoneNumber,
  CreateAssistantOptions,
  CreateCallOptions,
  UpdateAssistantOptions,
  ListCallsOptions,
} from './types.js'

/**
 * Vapi client for managing voice AI assistants, calls, and phone numbers
 *
 * @example
 * ```ts
 * import { VapiClient } from '@mdxai/vapi'
 *
 * const client = new VapiClient({
 *   apiKey: process.env.VAPI_API_KEY
 * })
 *
 * // Create an assistant
 * const assistant = await client.createAssistant({
 *   name: 'CustomerSupport',
 *   firstMessage: 'Hello! How can I help you?',
 *   voice: { provider: '11labs', voiceId: 'alloy' }
 * })
 *
 * // Make an outbound call
 * const call = await client.createCall({
 *   assistantId: assistant.id,
 *   phoneNumber: '+1234567890'
 * })
 * ```
 */
export class VapiClient {
  private sdk: VapiSDK
  private config: VapiClientConfig

  constructor(config: VapiClientConfig) {
    if (!config.apiKey) {
      throw new Error('Vapi API key is required')
    }

    this.config = config
    this.sdk = new VapiSDK({
      token: config.apiKey,
    })
  }

  /**
   * Create a new voice assistant
   */
  async createAssistant(options: CreateAssistantOptions): Promise<VapiAssistant> {
    const response = await this.sdk.assistants.create({
      name: options.name,
      firstMessage: options.firstMessage,
      model: options.model as any,
      voice: options.voice as any,
      transcriber: options.transcriber as any,
      functions: options.functions as any,
      endCallMessage: options.endCallMessage,
      endCallPhrases: options.endCallPhrases,
      backgroundSound: options.backgroundSound as any,
      recordingEnabled: options.recordingEnabled,
      voicemailDetection: options.voicemailDetection as any,
      metadata: options.metadata,
    } as any)

    return response as unknown as VapiAssistant
  }

  /**
   * Get an assistant by ID
   */
  async getAssistant(id: string): Promise<VapiAssistant | null> {
    try {
      const response = await this.sdk.assistants.get(id)
      return response as unknown as VapiAssistant
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * List all assistants
   */
  async listAssistants(options?: { limit?: number }): Promise<VapiAssistant[]> {
    const response = await this.sdk.assistants.list({
      limit: options?.limit,
    } as any)
    return (response as any) || []
  }

  /**
   * Update an assistant
   */
  async updateAssistant(id: string, options: UpdateAssistantOptions): Promise<VapiAssistant> {
    const response = await this.sdk.assistants.update(id, options as any)
    return response as unknown as VapiAssistant
  }

  /**
   * Delete an assistant
   */
  async deleteAssistant(id: string): Promise<void> {
    await this.sdk.assistants.delete(id)
  }

  /**
   * Create a call (outbound or web)
   */
  async createCall(options: CreateCallOptions): Promise<VapiCall> {
    const response = await this.sdk.calls.create({
      assistantId: options.assistantId,
      assistant: options.assistant as any,
      phoneNumber: options.phoneNumber ? { number: options.phoneNumber } : undefined,
      customer: options.customer,
      metadata: options.metadata,
    } as any)

    return response as unknown as VapiCall
  }

  /**
   * Get a call by ID
   */
  async getCall(id: string): Promise<VapiCall | null> {
    try {
      const response = await this.sdk.calls.get(id)
      return response as unknown as VapiCall
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * List calls with optional filtering
   */
  async listCalls(options?: ListCallsOptions): Promise<VapiCall[]> {
    const response = await this.sdk.calls.list({
      assistantId: options?.assistantId,
      limit: options?.limit,
    } as any)
    return (response as any) || []
  }

  /**
   * Delete call data
   */
  async deleteCall(id: string): Promise<void> {
    await this.sdk.calls.delete(id)
  }

  /**
   * List phone numbers
   */
  async listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
    const response = await this.sdk.phoneNumbers.list()
    return (response as any) || []
  }

  /**
   * Get a phone number by ID
   */
  async getPhoneNumber(id: string): Promise<VapiPhoneNumber | null> {
    try {
      const response = await this.sdk.phoneNumbers.get(id)
      return response as unknown as VapiPhoneNumber
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Update a phone number
   */
  async updatePhoneNumber(
    id: string,
    options: { assistantId?: string; name?: string }
  ): Promise<VapiPhoneNumber> {
    const response = await this.sdk.phoneNumbers.update(id, options as any)
    return response as unknown as VapiPhoneNumber
  }

  /**
   * Get the underlying Vapi SDK client for advanced operations
   */
  getSDK(): VapiSDK {
    return this.sdk
  }
}
