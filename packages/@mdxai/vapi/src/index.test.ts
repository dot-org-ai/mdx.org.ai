import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxai/vapi', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxai/vapi')
  })

  it('exports VapiClient', async () => {
    const { VapiClient } = await import('./index.js')
    expect(VapiClient).toBeDefined()
    expect(typeof VapiClient).toBe('function')
  })

  it('exports VapiAgent', async () => {
    const { VapiAgent } = await import('./index.js')
    expect(VapiAgent).toBeDefined()
    expect(typeof VapiAgent).toBe('function')
  })

  it('exports VapiWebhook', async () => {
    const { VapiWebhook } = await import('./index.js')
    expect(VapiWebhook).toBeDefined()
    expect(typeof VapiWebhook).toBe('function')
  })

  it('exports createVapiTools', async () => {
    const { createVapiTools } = await import('./index.js')
    expect(createVapiTools).toBeDefined()
    expect(typeof createVapiTools).toBe('function')
  })
})

describe('VapiClient', () => {
  it('throws error without API key', async () => {
    const { VapiClient } = await import('./index.js')
    expect(() => new VapiClient({})).toThrow('Vapi API key is required')
  })

  it('creates client with API key', async () => {
    const { VapiClient } = await import('./index.js')
    const client = new VapiClient({ apiKey: 'test-key' })
    expect(client).toBeDefined()
  })
})

describe('VapiWebhook', () => {
  it('creates webhook handler', async () => {
    const { VapiWebhook } = await import('./index.js')
    const webhook = new VapiWebhook({
      onCallEnd: async () => {},
    })
    expect(webhook).toBeDefined()
  })

  it('handles call.ended event', async () => {
    const { VapiWebhook } = await import('./index.js')
    let called = false
    const webhook = new VapiWebhook({
      onCallEnd: async () => {
        called = true
      },
    })

    const result = await webhook.handle({
      message: {
        type: 'call.ended',
        callId: 'test-123',
        call: {
          id: 'test-123',
          status: 'ended',
        },
      },
    })

    expect(result.success).toBe(true)
    expect(called).toBe(true)
  })

  it('handles function.call event', async () => {
    const { VapiWebhook } = await import('./index.js')
    let capturedEvent: any = null
    const webhook = new VapiWebhook({
      onFunctionCall: async (event) => {
        capturedEvent = event
      },
    })

    const result = await webhook.handle({
      message: {
        type: 'function.call',
        callId: 'test-123',
        functionName: 'testFunction',
        parameters: { arg1: 'value1' },
      },
    })

    expect(result.success).toBe(true)
    expect(capturedEvent).toBeDefined()
    expect(capturedEvent.functionName).toBe('testFunction')
    expect(capturedEvent.parameters).toEqual({ arg1: 'value1' })
  })
})

describe('createVapiTools', () => {
  it('creates tools array', async () => {
    const { createVapiTools, VapiClient } = await import('./index.js')
    const client = new VapiClient({ apiKey: 'test-key' })
    const tools = createVapiTools(client)

    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)
  })

  it('tools have required properties', async () => {
    const { createVapiTools, VapiClient } = await import('./index.js')
    const client = new VapiClient({ apiKey: 'test-key' })
    const tools = createVapiTools(client)

    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe('string')
      expect(tool.description).toBeDefined()
      expect(typeof tool.description).toBe('string')
      expect(tool.inputSchema).toBeDefined()
      expect(typeof tool.handler).toBe('function')
    }
  })

  it('includes expected tools', async () => {
    const { createVapiTools, VapiClient } = await import('./index.js')
    const client = new VapiClient({ apiKey: 'test-key' })
    const tools = createVapiTools(client)

    const toolNames = tools.map((t) => t.name)
    expect(toolNames).toContain('vapi_create_assistant')
    expect(toolNames).toContain('vapi_list_assistants')
    expect(toolNames).toContain('vapi_create_call')
    expect(toolNames).toContain('vapi_list_calls')
    expect(toolNames).toContain('vapi_list_phone_numbers')
  })
})
