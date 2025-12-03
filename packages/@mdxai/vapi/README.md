# @mdxai/vapi

Vapi voice AI integration for MDXAI. Build voice-enabled AI applications with MDX-driven prompts and Vapi's voice infrastructure.

> **Note:** This package is currently a placeholder. Implementation coming soon.

## Planned Features

- **Voice Agents** - Define voice agents in MDX
- **Phone Integration** - Inbound/outbound phone calls
- **WebRTC** - Browser-based voice interactions
- **Transcription** - Real-time speech-to-text
- **Voice Synthesis** - Text-to-speech with multiple voices
- **Call Handling** - Transfer, hold, and call control
- **Type-Safe** - Full TypeScript support

## Planned API

```typescript
import { VapiAgent, VapiClient } from '@mdxai/vapi'
import { parse } from 'mdxld'

// Define voice agent from MDX
const agentDoc = parse(`---
$type: VoiceAgent
name: CustomerSupport
voice: allison
language: en-US
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

// Create Vapi client
const vapi = new VapiClient({
  apiKey: process.env.VAPI_API_KEY
})

// Create voice agent
const agent = new VapiAgent(vapi, agentDoc)

// Start WebRTC session
const session = await agent.startWebSession()

// Or make outbound call
const call = await agent.call('+1234567890')

// Handle events
agent.on('transcript', (text) => {
  console.log('User said:', text)
})

agent.on('response', (text) => {
  console.log('Agent said:', text)
})
```

## Planned Webhook Handler

```typescript
import { VapiWebhook } from '@mdxai/vapi'

// Handle Vapi webhooks in your server
export const vapiWebhook = new VapiWebhook({
  secret: process.env.VAPI_WEBHOOK_SECRET,

  onCallStart: async (call) => {
    console.log('Call started:', call.id)
  },

  onCallEnd: async (call) => {
    // Save call transcript to MDXDB
    await db.insert({
      $type: 'CallTranscript',
      callId: call.id,
      transcript: call.transcript,
      duration: call.duration
    })
  },

  onTransfer: async (call, target) => {
    // Handle call transfers
  }
})

// Use with Hono
app.post('/webhooks/vapi', vapiWebhook.handle)
```

## Planned Browser Integration

```typescript
import { useVapi } from '@mdxai/vapi/react'

function VoiceChat() {
  const {
    isConnected,
    isListening,
    transcript,
    connect,
    disconnect,
    mute,
    unmute
  } = useVapi({
    agent: agentDoc,
    onMessage: (message) => {
      console.log('Agent:', message)
    }
  })

  return (
    <div>
      <button onClick={isConnected ? disconnect : connect}>
        {isConnected ? 'End Call' : 'Start Call'}
      </button>
      <p>{transcript}</p>
    </div>
  )
}
```

## Installation

```bash
npm install @mdxai/vapi
# or
pnpm add @mdxai/vapi
# or
yarn add @mdxai/vapi
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxai](https://www.npmjs.com/package/mdxai) | Core MDXAI package |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude integration |
| [vapi](https://vapi.ai) | Vapi voice AI platform |

## Contributing

Contributions welcome! If you'd like to help implement this package, please open an issue to discuss the approach.

## License

MIT
