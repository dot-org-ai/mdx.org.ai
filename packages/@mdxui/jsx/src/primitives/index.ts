/**
 * @mdxui/jsx/primitives - Core primitive components
 *
 * These primitives provide the foundation for building Radix-compatible components.
 */

export { composeRefs, useComposedRefs } from './compose-refs'
export { Slot, Slottable, type SlotProps } from './slot.js'
export { Primitive, dispatchDiscreteCustomEvent, type PrimitivePropsWithRef } from './primitive.js'
export { Portal, type PortalProps } from './portal.js'
export { Presence, usePresence, type PresenceProps } from './presence.js'
