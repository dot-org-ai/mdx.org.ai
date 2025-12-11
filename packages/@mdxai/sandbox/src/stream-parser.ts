import { StreamEvent, StreamEventSchema } from './types'

/**
 * Parse a line of stream-json output from Claude Code
 *
 * Claude Code with --output-format stream-json outputs one JSON object per line.
 * Each line represents a single event in the agent session.
 *
 * @param line - A single line from Claude Code stdout
 * @returns Parsed and validated StreamEvent, or null if invalid
 */
export function parseStreamJson(line: string): StreamEvent | null {
  if (!line.trim()) {
    return null
  }

  try {
    const json = JSON.parse(line)
    return StreamEventSchema.parse(json)
  } catch (error) {
    console.error('Failed to parse stream-json line:', line, error)
    return null
  }
}

/**
 * Parse multiple lines of stream-json output
 *
 * @param lines - Array of lines from Claude Code stdout
 * @returns Array of valid StreamEvents
 */
export function parseStreamJsonLines(lines: string[]): StreamEvent[] {
  return lines
    .map(line => parseStreamJson(line))
    .filter((event): event is StreamEvent => event !== null)
}

/**
 * Create an async iterator from a ReadableStream that yields StreamEvents
 *
 * This allows consuming Claude Code output with for-await-of:
 *
 * ```typescript
 * for await (const event of streamEvents(process.stdout)) {
 *   console.log(event.type, event)
 * }
 * ```
 *
 * @param stream - ReadableStream from sandbox process stdout
 * @returns AsyncIterableIterator of StreamEvents
 */
export async function* streamEvents(
  stream: ReadableStream<Uint8Array>
): AsyncIterableIterator<StreamEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const event = parseStreamJson(buffer)
          if (event) {
            yield event
          }
        }
        break
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const event = parseStreamJson(line)
        if (event) {
          yield event
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Extract summary information from a stream of events
 *
 * This can be used to aggregate statistics from a completed session.
 */
export interface StreamSummary {
  totalEvents: number
  assistantMessages: number
  toolCalls: number
  toolResults: number
  errors: number
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  stopReason?: string
  exitCode?: number
}

export function summarizeStreamEvents(events: StreamEvent[]): StreamSummary {
  const summary: StreamSummary = {
    totalEvents: events.length,
    assistantMessages: 0,
    toolCalls: 0,
    toolResults: 0,
    errors: 0,
  }

  for (const event of events) {
    switch (event.type) {
      case 'assistant':
        summary.assistantMessages++
        break
      case 'tool_use':
        summary.toolCalls++
        break
      case 'tool_result':
        summary.toolResults++
        break
      case 'result':
        summary.usage = event.usage
        summary.stopReason = event.stop_reason
        break
      case 'error':
        summary.errors++
        break
      case 'complete':
        summary.exitCode = event.exitCode
        break
    }
  }

  return summary
}
