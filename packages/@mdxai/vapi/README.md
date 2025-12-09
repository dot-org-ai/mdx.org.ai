# @mdxai/vapi

Vapi voice AI integration for MDXAI. Build voice-enabled AI applications with MDX-driven prompts and Vapi's voice infrastructure.

## Features

- **Voice Agents** - Define voice agents in MDX
- **Phone Integration** - Inbound/outbound phone calls
- **WebRTC** - Browser-based voice interactions
- **Transcription** - Real-time speech-to-text
- **Voice Synthesis** - Text-to-speech with multiple voices
- **Call Handling** - Transfer, hold, and call control
- **Type-Safe** - Full TypeScript support

## Usage

### Basic Setup

```typescript
import { VapiClient } from '@mdxai/vapi'

// Initialize the Vapi client
const client = new VapiClient({
  apiKey: process.env.VAPI_API_KEY
})

// Create a voice assistant
const assistant = await client.createAssistant({
  name: 'CustomerSupport',
  firstMessage: 'Hello! How can I help you today?',
  instructions: 'You are a friendly customer support agent for Acme Inc.',
  voice: { provider: '11labs', voiceId: 'alloy' },
  model: { provider: 'openai', model: 'gpt-4' }
})

// Make an outbound call
const call = await client.createCall({
  assistantId: assistant.id,
  phoneNumber: '+1234567890'
})
```

### MDX-Driven Voice Agents

```typescript
import { VapiAgent, VapiClient } from '@mdxai/vapi'
import { parse } from 'mdxld'

// Define voice agent from MDX
const agentDoc = parse(`---
$type: VoiceAgent
name: CustomerSupport
voice: alloy
firstMessage: Hello! How can I help you today?
---

You are a friendly customer support agent for Acme Inc.

## Guidelines
- Be helpful and professional
- If you can't help, offer to transfer to a human
- Keep responses concise for voice

## Common Questions
- Order status: Ask for order number and look it up
- Returns: Explain the 30-day return policy
- Technical support: Transfer to technical team
`)

const client = new VapiClient({ apiKey: process.env.VAPI_API_KEY })
const agent = new VapiAgent({ client, document: agentDoc })

// Initialize the agent (creates assistant)
await agent.initialize()

// Make an outbound call
const call = await agent.call('+1234567890')

// Handle events
agent.on('transcript', (event) => {
  console.log(`${event.role}: ${event.message}`)
})

agent.on('response', (event) => {
  console.log('Agent said:', event.message)
})
```

### Webhook Handler

```typescript
import { VapiWebhook } from '@mdxai/vapi'
import { Hono } from 'hono'

// Handle Vapi webhooks in your server
const webhook = new VapiWebhook({
  secret: process.env.VAPI_WEBHOOK_SECRET,

  onCallStart: async (event) => {
    console.log('Call started:', event.callId)
  },

  onCallEnd: async (event) => {
    console.log('Call ended:', event.callId)
    console.log('Duration:', event.call.duration)
    console.log('Transcript:', event.transcript)

    // Save call data to your database
    await db.set(`calls/${event.callId}`, {
      $type: 'CallTranscript',
      callId: event.callId,
      transcript: event.transcript,
      duration: event.call.duration,
      recordingUrl: event.recordingUrl
    })
  },

  onFunctionCall: async (event) => {
    console.log('Function called:', event.functionName)
    console.log('Parameters:', event.parameters)

    // Return result for the function call
    return { result: 'success', data: { /* ... */ } }
  }
})

// Use with Hono
const app = new Hono()
app.post('/webhooks/vapi', async (c) => {
  const body = await c.req.json()
  const result = await webhook.handle(body)
  return c.json(result)
})
```

### AI Agent Tools (MCP/Claude Integration)

```typescript
import { VapiClient, createVapiTools } from '@mdxai/vapi'

const client = new VapiClient({ apiKey: process.env.VAPI_API_KEY })
const tools = createVapiTools(client)

// Use with Claude or other AI agents
// Tools include:
// - vapi_create_assistant
// - vapi_list_assistants
// - vapi_get_assistant
// - vapi_create_call
// - vapi_get_call
// - vapi_list_calls
// - vapi_list_phone_numbers
// - vapi_update_phone_number

// Example: AI agent can now make voice calls
const response = await agent.run({
  prompt: "Create a customer support assistant and call the customer at +1234567890",
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJsonSchema(t.inputSchema)
  })),
  toolHandler: async (name, args) => {
    const tool = tools.find(t => t.name === name)
    return tool?.handler(args)
  }
})
```

### Phone Number Management

```typescript
// List phone numbers
const phoneNumbers = await client.listPhoneNumbers()

// Assign assistant to phone number
await client.updatePhoneNumber(phoneNumber.id, {
  assistantId: assistant.id,
  name: 'Support Line'
})

// Now inbound calls to this number will use the assistant
```

## Installation

```bash
npm install @mdxai/vapi
# or
pnpm add @mdxai/vapi
# or
yarn add @mdxai/vapi
```

## API Reference

### VapiClient

Main client for server-side operations.

- `createAssistant(options)` - Create a voice assistant
- `getAssistant(id)` - Get assistant details
- `listAssistants(options?)` - List all assistants
- `updateAssistant(id, options)` - Update an assistant
- `deleteAssistant(id)` - Delete an assistant
- `createCall(options)` - Create an outbound call
- `getCall(id)` - Get call details
- `listCalls(options?)` - List calls with filtering
- `deleteCall(id)` - Delete call data
- `listPhoneNumbers()` - List phone numbers
- `getPhoneNumber(id)` - Get phone number details
- `updatePhoneNumber(id, options)` - Update phone number configuration

### VapiAgent

MDX-driven voice agent.

- `initialize()` - Create or retrieve the assistant
- `call(phoneNumber, metadata?)` - Make an outbound call
- `startWebSession()` - Start a WebRTC session
- `update(options)` - Update the agent's assistant
- `on(event, handler)` - Register event handler
- `off(event, handler)` - Unregister event handler

### VapiWebhook

Webhook event handler.

- `handle(body)` - Process webhook events

Events:
- `call.started` - Call has started
- `call.ended` - Call has ended
- `transcript.update` - New transcript segment
- `function.call` - Function was called
- `assistant.request` - Assistant was requested
- `status.update` - Call status changed

### Voice Presets

Pre-configured voices from 11labs:
- `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

### Model Presets

Pre-configured AI models:
- `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- `claude-3-opus`, `claude-3-sonnet`
- `llama-3-70b`

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxai](https://www.npmjs.com/package/mdxai) | Core MDXAI package |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude integration |
| [@vapi-ai/server-sdk](https://www.npmjs.com/package/@vapi-ai/server-sdk) | Official Vapi SDK |
| [@vapi-ai/web](https://www.npmjs.com/package/@vapi-ai/web) | Vapi WebRTC client |
| [vapi.ai](https://vapi.ai) | Vapi voice AI platform |

## Contributing

Contributions welcome! Please open an issue to discuss changes before submitting a PR.

## License

MIT
