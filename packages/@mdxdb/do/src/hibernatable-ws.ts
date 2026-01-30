/**
 * Hibernatable WebSocket Handler
 *
 * Utilities for managing hibernatable WebSocket connections.
 * Reduces duration-based billing by 95% for idle connections.
 *
 * @packageDocumentation
 */

import type { SessionData, RPCMessage, RPCResponse } from './types.js'

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create initial session data
 */
export function createSession(options: Partial<SessionData> = {}): SessionData {
  return {
    id: options.id ?? generateSessionId(),
    clientId: options.clientId,
    token: options.token,
    metadata: options.metadata,
    lastActivity: Date.now(),
  }
}

/**
 * Parse RPC message from WebSocket
 */
export function parseRpcMessage(data: string | ArrayBuffer): RPCMessage | null {
  try {
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Create RPC success response
 */
export function createRpcResult(id: string, result: unknown): RPCResponse {
  return { id, result }
}

/**
 * Create RPC error response
 */
export function createRpcError(
  id: string,
  code: number,
  message: string,
  data?: unknown
): RPCResponse {
  return {
    id,
    error: { code, message, data },
  }
}

/**
 * Standard JSON-RPC error codes
 */
export const RpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

/**
 * Send RPC response over WebSocket
 */
export function sendRpcResponse(ws: WebSocket, response: RPCResponse): void {
  ws.send(JSON.stringify(response))
}

/**
 * Serialize session data for hibernation attachment
 */
export function serializeSession(session: SessionData): string {
  return JSON.stringify(session)
}

/**
 * Deserialize session data from hibernation attachment
 */
export function deserializeSession(data: string): SessionData | null {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
