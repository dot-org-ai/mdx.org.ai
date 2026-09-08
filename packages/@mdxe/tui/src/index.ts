/**
 * @mdxe/tui — the viewer seam.
 *
 * This entry is dependency-free and framework-free: types, the ANSI stripper, the input decoder,
 * the default keymap, and the TTY guard. Viewer implementations live behind their own lazy
 * entrypoints (`@mdxe/ink`, `@mdxe/opentui`); the reference stub, conformance suite and
 * benchmark harness are subpath exports (`@mdxe/tui/stub`, `/conformance`, `/benchmark`).
 *
 * @packageDocumentation
 */

export type {
  Action,
  FrameStream,
  InputEvent,
  InputSource,
  KeyEvent,
  KeyName,
  Keymap,
  MountHandle,
  PasteEvent,
  ResizeEvent,
  Terminal,
  TerminalInput,
  TerminalOutput,
  Viewer,
  ViewerErrorCode,
  ViewerFactory,
  ViewerInput,
} from './types'
export { ViewerError, isViewerError } from './types'
export { stripAnsi, hasAnsi, frameToString } from './ansi'
export { decodeInput, defaultKeymap, mapActions, createInputSource, createQueue } from './input'
export { canAttach, assertAttachable } from './tty'
