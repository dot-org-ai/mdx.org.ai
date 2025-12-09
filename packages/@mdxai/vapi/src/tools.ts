/**
 * Vapi tools for AI agents (MCP/Claude integration)
 */

import { z } from 'zod'
import type { VapiClient } from './client.js'

/**
 * Tool response format compatible with Claude SDK
 */
export interface ToolResponse {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

/**
 * Vapi tool definition for AI agents
 */
export interface VapiTool {
  name: string
  description: string
  inputSchema: z.ZodObject<any>
  handler: (args: Record<string, unknown>) => Promise<ToolResponse>
}

/**
 * Create Vapi tools for AI agents
 *
 * Returns an array of tools that AI agents can use to interact with Vapi:
 * - vapi_create_assistant: Create a new voice assistant
 * - vapi_list_assistants: List all assistants
 * - vapi_get_assistant: Get assistant details
 * - vapi_create_call: Make an outbound call
 * - vapi_get_call: Get call details
 * - vapi_list_calls: List calls
 * - vapi_list_phone_numbers: List phone numbers
 *
 * @example
 * ```ts
 * import { VapiClient, createVapiTools } from '@mdxai/vapi'
 *
 * const client = new VapiClient({ apiKey: process.env.VAPI_API_KEY })
 * const tools = createVapiTools(client)
 *
 * // Use with Claude or other AI agents
 * const response = await agent.run({
 *   tools: tools.map(t => ({
 *     name: t.name,
 *     description: t.description,
 *     input_schema: zodToJsonSchema(t.inputSchema)
 *   })),
 *   toolHandler: async (name, args) => {
 *     const tool = tools.find(t => t.name === name)
 *     return tool?.handler(args)
 *   }
 * })
 * ```
 */
export function createVapiTools(client: VapiClient): VapiTool[] {
  const success = (data: unknown): ToolResponse => ({
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  })

  const error = (message: string): ToolResponse => ({
    content: [{ type: 'text', text: message }],
    isError: true,
  })

  return [
    {
      name: 'vapi_create_assistant',
      description: 'Create a new voice assistant with specified configuration including name, voice, model, and instructions',
      inputSchema: z.object({
        name: z.string().describe('Name of the assistant'),
        instructions: z.string().optional().describe('System instructions/prompt for the assistant'),
        firstMessage: z.string().optional().describe('First message the assistant says when call starts'),
        voice: z
          .object({
            provider: z.enum(['11labs', 'playht', 'deepgram', 'azure']).optional(),
            voiceId: z.string(),
          })
          .optional()
          .describe('Voice configuration'),
        model: z
          .object({
            provider: z.enum(['openai', 'anthropic', 'groq', 'together-ai']).optional(),
            model: z.string(),
          })
          .optional()
          .describe('AI model configuration'),
      }),
      handler: async (args: Record<string, unknown>) => {
        try {
          const assistant = await client.createAssistant({
            name: args.name as string,
            instructions: args.instructions as string,
            firstMessage: args.firstMessage as string,
            voice: args.voice as any,
            model: args.model as any,
          })
          return success(assistant)
        } catch (err) {
          return error(`Failed to create assistant: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'vapi_list_assistants',
      description: 'List all voice assistants',
      inputSchema: z.object({
        limit: z.number().optional().describe('Maximum number of assistants to return'),
      }),
      handler: async (args: Record<string, unknown>) => {
        try {
          const assistants = await client.listAssistants({ limit: args.limit as number })
          return success(assistants)
        } catch (err) {
          return error(`Failed to list assistants: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'vapi_get_assistant',
      description: 'Get details of a specific voice assistant by ID',
      inputSchema: z.object({
        id: z.string().describe('Assistant ID'),
      }),
      handler: async (args: Record<string, unknown>) => {
        try {
          const assistant = await client.getAssistant(args.id as string)
          if (!assistant) {
            return error(`Assistant not found: ${args.id}`)
          }
          return success(assistant)
        } catch (err) {
          return error(`Failed to get assistant: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'vapi_create_call',
      description: 'Create an outbound phone call using a voice assistant',
      inputSchema: z.object({
        assistantId: z.string().describe('ID of the assistant to use for the call'),
        phoneNumber: z.string().describe('Phone number to call in E.164 format (e.g., +1234567890)'),
        metadata: z.record(z.unknown()).optional().describe('Optional metadata for the call'),
      }),
      handler: async (args: Record<string, unknown>) => {
        try {
          const call = await client.createCall({
            assistantId: args.assistantId as string,
            phoneNumber: args.phoneNumber as string,
            metadata: args.metadata as Record<string, unknown>,
          })
          return success(call)
        } catch (err) {
          return error(`Failed to create call: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'vapi_get_call',
      description: 'Get details of a specific call by ID including transcript and status',
      inputSchema: z.object({
        id: z.string().describe('Call ID'),
      }),
      handler: async (args: Record<string, unknown>) => {
        try {
          const call = await client.getCall(args.id as string)
          if (!call) {
            return error(`Call not found: ${args.id}`)
          }
          return success(call)
        } catch (err) {
          return error(`Failed to get call: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'vapi_list_calls',
      description: 'List calls with optional filtering by assistant',
      inputSchema: z.object({
        assistantId: z.string().optional().describe('Filter calls by assistant ID'),
        limit: z.number().optional().describe('Maximum number of calls to return'),
      }),
      handler: async (args: Record<string, unknown>) => {
        try {
          const calls = await client.listCalls({
            assistantId: args.assistantId as string,
            limit: args.limit as number,
          })
          return success(calls)
        } catch (err) {
          return error(`Failed to list calls: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'vapi_list_phone_numbers',
      description: 'List all phone numbers configured for inbound calls',
      inputSchema: z.object({}),
      handler: async () => {
        try {
          const phoneNumbers = await client.listPhoneNumbers()
          return success(phoneNumbers)
        } catch (err) {
          return error(`Failed to list phone numbers: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
    {
      name: 'vapi_update_phone_number',
      description: 'Update a phone number configuration (e.g., assign assistant)',
      inputSchema: z.object({
        id: z.string().describe('Phone number ID'),
        assistantId: z.string().optional().describe('Assistant ID to assign to this phone number'),
        name: z.string().optional().describe('Name/label for the phone number'),
      }),
      handler: async (args: Record<string, unknown>) => {
        try {
          const phoneNumber = await client.updatePhoneNumber(args.id as string, {
            assistantId: args.assistantId as string,
            name: args.name as string,
          })
          return success(phoneNumber)
        } catch (err) {
          return error(`Failed to update phone number: ${err instanceof Error ? err.message : String(err)}`)
        }
      },
    },
  ]
}
