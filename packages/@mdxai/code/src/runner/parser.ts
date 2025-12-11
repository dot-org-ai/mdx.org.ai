import type { StreamEvent } from '../types.js'

/**
 * Parse stream-json output from Claude CLI
 */
export function parseStreamJson(line: string): StreamEvent | null {
  try {
    const trimmed = line.trim()
    if (!trimmed) return null

    const parsed = JSON.parse(trimmed)
    return {
      type: parsed.type,
      data: parsed,
      timestamp: new Date(),
    }
  } catch (error) {
    // Invalid JSON, skip
    return null
  }
}

/**
 * Parse multiple lines of stream-json output
 */
export function* parseStreamLines(chunk: string): Generator<StreamEvent> {
  const lines = chunk.split('\n')
  for (const line of lines) {
    const event = parseStreamJson(line)
    if (event) {
      yield event
    }
  }
}
