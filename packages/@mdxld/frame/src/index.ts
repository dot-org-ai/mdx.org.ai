/**
 * # @mdxld/frame — the unstyled contract for Field, Frame, View and Rendering
 *
 * ```
 * View  ──materialised at one moment──▶  Frame  ──serialized──▶  Rendering
 *   the standing definition               a bundle of Fields       markdown │ data │ React
 * ```
 *
 * - a **Field** is the atom: a value plus the provenance it was derived under, in one of four
 *   presence states — present, absent (`—`), withheld (licence-gated, carrying its class), and
 *   unconfirmed (local, not yet acknowledged);
 * - a **Frame** is a View materialised at one moment, and invents nothing;
 * - a **View** is the standing definition — which Roles, at what token budget, addressed by id;
 *   unknown ids fail closed and an over-budget View throws;
 * - a **Rendering** is one serialization of a Frame, and never invents or changes a value.
 *
 * Zero appearance: no CSS, no class names, no colours, no spacing, no JSX. Runtime-agnostic: no
 * React, no DOM, no HTML, no dependencies at all.
 *
 * @packageDocumentation
 */

export { FieldHonestyError, FrameError, UnknownIdError, BudgetExceededError, FaceParityError, type ParityBreach } from './errors.js'

export {
  type Attribution,
  type Presence,
  type AsOf,
  type SourceWatermark,
  type Field,
  type PresentField,
  type UnconfirmedField,
  type AbsentField,
  type WithheldField,
  type FieldSpec,
  makeField,
  present,
  unconfirmed,
  absent,
  withheld,
  hasValue,
  isField,
  isHonestConfidence,
  assertFieldHonest,
} from './field.js'

export {
  type FieldMap,
  type SnapshotToken,
  type RoleFrame,
  type Frame,
  type PathedField,
  makeFrame,
  walkFrame,
  framePaths,
  scalarPath,
  cellPath,
} from './frame.js'

export { ABSENT_GLYPH, UNCONFIRMED_MARK, canonicalText, provenanceMark, valueText, renderGlyph, isConfirmed } from './glyph.js'

export { type MarkdownFaceKind, type MarkdownFace, type RoleSpec, type View, ViewRegistry, createRegistry } from './view.js'

export { type Tokenizer, type TokenAccount, approxCharsPerToken } from './tokenize.js'

export {
  type EmittedValue,
  type Rendering,
  type RenderContext,
  type RenderSink,
  type RenderOptions,
  renderFrame,
  markdownSink,
  dataSink,
  renderMarkdown,
  renderData,
  declareRendering,
} from './render.js'

export { type ParityOptions, faceParity, assertFaceParity } from './parity.js'
