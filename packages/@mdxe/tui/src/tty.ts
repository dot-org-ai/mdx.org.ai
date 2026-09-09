import type { Terminal } from './types'
import { ViewerError } from './types'

/**
 * May a viewer attach? Only when both streams are TTYs. Raw mode fails open on pipes and a
 * painted frame on a redirected stdout corrupts the machine payload, so the answer under any
 * ambiguity is no — the caller falls back to the plain register bytes.
 */
export function canAttach(terminal: Terminal): { ok: true } | { ok: false; reason: string } {
  if (terminal.stdout.isTTY !== true) return { ok: false, reason: 'stdout is not a TTY' }
  if (terminal.stdin.isTTY !== true) return { ok: false, reason: 'stdin is not a TTY' }
  return { ok: true }
}

/** Throw `ViewerError('NOT_A_TTY')` unless {@link canAttach}. Every viewer calls this first in `mount`. */
export function assertAttachable(terminal: Terminal, viewer: string): void {
  const check = canAttach(terminal)
  if (!check.ok) throw new ViewerError('NOT_A_TTY', `${viewer}: refusing to attach — ${check.reason}`)
}
