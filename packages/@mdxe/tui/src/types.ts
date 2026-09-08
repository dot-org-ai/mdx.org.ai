/**
 * The viewer seam (Kestrel ADR-0052 §4, adopted for mdx.org.ai).
 *
 * Renderers are pure tree → bytes (`@mdxui/text`). A TUI is a *shell* that displays
 * those bytes and handles input; it never invents or changes a byte. Two viewers
 * (Ink, OpenTUI) implement this seam so the framework choice stops mattering.
 *
 * Contract, enforced by `@mdxe/tui/conformance`:
 *   1. strip(paint(bytes)) === bytes — the frame on screen, ANSI stripped, equals the plain register bytes.
 *   2. Input events (key, paste, resize) map to the same {@link Action}s via the shared {@link Keymap}.
 *   3. A viewer never attaches when stdout (or stdin) is not a TTY — raw mode fails open on pipes.
 *   4. After `unmount()` raw mode is released and nothing more is written.
 */

/** A stream of frames: each chunk is one complete register frame from the renderer. */
export type FrameStream = AsyncIterable<Uint8Array | string>

/** Minimal shape of a writable terminal output (a `NodeJS.WriteStream` satisfies it). */
export interface TerminalOutput {
  readonly isTTY?: boolean
  readonly columns?: number
  readonly rows?: number
  write(chunk: string | Uint8Array): unknown
  on?(event: 'resize', listener: () => void): unknown
  off?(event: 'resize', listener: () => void): unknown
}

/** Minimal shape of a readable terminal input (a `NodeJS.ReadStream` satisfies it). */
export interface TerminalInput {
  readonly isTTY?: boolean
  setRawMode?(mode: boolean): unknown
  on?(event: 'data', listener: (chunk: Uint8Array | string) => void): unknown
  off?(event: 'data', listener: (chunk: Uint8Array | string) => void): unknown
  resume?(): unknown
  pause?(): unknown
}

/** The terminal a viewer attaches to. Pass `process.stdout`/`process.stdin` or a fake. */
export interface Terminal {
  readonly stdout: TerminalOutput
  readonly stdin: TerminalInput
}

/** Named keys a viewer can receive beyond printable characters. */
export type KeyName =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'pageup'
  | 'pagedown'
  | 'home'
  | 'end'
  | 'enter'
  | 'escape'
  | 'tab'
  | 'backspace'
  | 'delete'
  | 'space'

/** A decoded key press. `key` is a named key or a single printable character. */
export interface KeyEvent {
  readonly type: 'key'
  readonly key: KeyName | string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
}

/** Bracketed-paste payload delivered whole. */
export interface PasteEvent {
  readonly type: 'paste'
  readonly text: string
}

/** Terminal geometry changed. */
export interface ResizeEvent {
  readonly type: 'resize'
  readonly columns: number
  readonly rows: number
}

export type InputEvent = KeyEvent | PasteEvent | ResizeEvent

/** A source of decoded input events. `createInputSource` builds one from a {@link Terminal}. */
export type InputSource = AsyncIterable<InputEvent>

/** The actions a viewer emits. Viewers map events → actions through a {@link Keymap}; the host decides what they mean. */
export type Action =
  | { readonly type: 'quit' }
  | { readonly type: 'scroll'; readonly lines: number }
  | { readonly type: 'page'; readonly direction: -1 | 1 }
  | { readonly type: 'jump'; readonly to: 'top' | 'bottom' }
  | { readonly type: 'select' }
  | { readonly type: 'back' }
  | { readonly type: 'search' }
  | { readonly type: 'insert'; readonly text: string }
  | { readonly type: 'resize'; readonly columns: number; readonly rows: number }

/** Maps one input event to an action, or `null` when the event is unbound. */
export type Keymap = (event: InputEvent) => Action | null

/** What a viewer receives on `mount`: the terminal to attach to, the decoded events, the keymap. */
export interface ViewerInput {
  readonly terminal: Terminal
  /** Decoded events. When omitted the viewer must decode `terminal.stdin` itself via `createInputSource`. */
  readonly events?: InputSource
  /** Defaults to `defaultKeymap`. */
  readonly keymap?: Keymap
}

/** Handle returned by a successful mount. */
export interface MountHandle {
  /** Resolves after the next frame has been painted to `terminal.stdout`. */
  nextPaint(): Promise<void>
  /** Subscribe to mapped actions. Returns an unsubscribe function. */
  onAction(listener: (action: Action) => void): () => void
  /** Number of frames painted so far. */
  readonly painted: number
}

/** The seam. Ink and OpenTUI each implement exactly this. */
export interface Viewer {
  /** Stable identifier, e.g. `ink`, `opentui`, `stub`. */
  readonly name: string
  /** Attach to the terminal and start displaying frames. Rejects with `ViewerError('NOT_A_TTY')` off a TTY. */
  mount(stream: FrameStream, input: ViewerInput): Promise<MountHandle>
  /** Detach: release raw mode, stop painting. Idempotent; a no-op when nothing is mounted. */
  unmount(): Promise<void>
}

/** A lazy constructor so the implementation module is imported only when a viewer is actually wanted. */
export type ViewerFactory = () => Promise<Viewer> | Viewer

export type ViewerErrorCode = 'NOT_A_TTY' | 'ALREADY_MOUNTED'

export class ViewerError extends Error {
  override readonly name = 'ViewerError'
  constructor(
    readonly code: ViewerErrorCode,
    message: string,
  ) {
    super(message)
  }
}
