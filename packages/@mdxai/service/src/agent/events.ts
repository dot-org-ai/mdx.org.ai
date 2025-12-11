/**
 * Event normalization utilities
 *
 * Converts Claude Agent SDK messages to our unified StreamEvent format.
 * Handles events from both SDK V2 (DO-native) and stream-json (local/sandbox).
 *
 * TODO: Implement event normalization
 */

import type { StreamEvent } from '../types'

/**
 * Normalize SDK message to StreamEvent
 *
 * TODO: Implement based on actual Agent SDK V2 message format
 */
export function normalizeSDKMessage(message: unknown): StreamEvent {
  // TODO: Implement proper normalization
  return {
    type: 'unknown',
    raw: message,
  }
}

/**
 * Normalize stream-json event to StreamEvent
 *
 * Stream-json format comes from `pnpm claude --output-format stream-json`
 * TODO: Implement based on actual stream-json format
 */
export function normalizeStreamJson(json: unknown): StreamEvent | null {
  if (!json || typeof json !== 'object') {
    return null
  }

  // TODO: Implement proper normalization based on stream-json format
  return {
    type: 'unknown',
    raw: json,
  }
}

/**
 * Detect event type from raw data
 */
export function detectEventType(data: unknown): StreamEvent['type'] {
  if (!data || typeof data !== 'object') {
    return 'unknown'
  }

  // TODO: Implement proper detection logic
  return 'unknown'
}
