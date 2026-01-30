/**
 * Hibernatable WebSocket utilities
 *
 * capnweb's newWorkersRpcResponse handles hibernatable WebSocket
 * connections automatically. These utilities are for session management
 * when custom session tracking is needed alongside capnweb.
 *
 * @packageDocumentation
 */

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}
