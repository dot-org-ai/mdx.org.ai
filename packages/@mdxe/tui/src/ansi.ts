/**
 * ANSI escape handling. `stripAnsi` is the conformance oracle: what remains after stripping
 * must equal the plain register bytes the renderer emitted.
 */

// CSI (ESC [ ... final), OSC (ESC ] ... BEL | ESC \), and lone two-byte ESC sequences.
const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g

/** Remove every ANSI escape sequence (SGR, cursor movement, erase, OSC, private modes). */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

/** Does the text carry any escape sequence at all? */
export function hasAnsi(text: string): boolean {
  ANSI_PATTERN.lastIndex = 0
  const found = ANSI_PATTERN.test(text)
  ANSI_PATTERN.lastIndex = 0
  return found
}

const decoder = new TextDecoder()

/** Frames may arrive as bytes or strings; the seam compares strings. */
export function frameToString(chunk: Uint8Array | string): string {
  return typeof chunk === 'string' ? chunk : decoder.decode(chunk)
}
