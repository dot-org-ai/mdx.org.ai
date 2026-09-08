/**
 * @mdxe/ink — the lazy entry.
 *
 * Importing this module loads neither `ink` nor `react`: the viewer imports both inside
 * `mount()`, after the TTY guard has passed. `inkViewer(options)` builds a `ViewerFactory` for
 * hosts that pick a viewer at runtime; `createInkViewer(options)` builds the viewer directly.
 *
 * @packageDocumentation
 */

import type { ViewerFactory } from '@mdxe/tui'
import type { InkViewerOptions } from './viewer'

export type { InkRuntime, InkViewerOptions, Painted } from './viewer'
export { DEFAULT_COLUMNS, createInkViewer, loadInk, paint } from './viewer'

/** A `ViewerFactory` that defers even this package's viewer module until a viewer is wanted. */
export const inkViewer =
  (options: InkViewerOptions = {}): ViewerFactory =>
  () =>
    import('./viewer').then((m) => m.createInkViewer(options))
