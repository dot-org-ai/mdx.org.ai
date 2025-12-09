import {
  forwardRef,
  createElement,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '../react'
import { Slot } from './slot'

/* -------------------------------------------------------------------------------------------------
 * Primitive
 * -----------------------------------------------------------------------------------------------*/

const NODES = [
  'a',
  'button',
  'div',
  'form',
  'h2',
  'h3',
  'img',
  'input',
  'label',
  'li',
  'nav',
  'ol',
  'p',
  'span',
  'svg',
  'ul',
] as const

type PrimitivePropsWithRef<E extends React.ElementType> = ComponentPropsWithoutRef<E> & {
  asChild?: boolean
}

type PrimitiveForwardRefComponent<E extends React.ElementType> = React.ForwardRefExoticComponent<
  PrimitivePropsWithRef<E> & React.RefAttributes<ElementRef<E>>
>

type Primitives = {
  [E in (typeof NODES)[number]]: PrimitiveForwardRefComponent<E>
}

/**
 * Primitive is a low-level component that renders a DOM element.
 * It supports the `asChild` pattern via the Slot component.
 *
 * @example
 * ```tsx
 * // Renders a div
 * <Primitive.div>Hello</Primitive.div>
 *
 * // With asChild, renders the child element with Primitive's props
 * <Primitive.div asChild>
 *   <span>Hello</span>
 * </Primitive.div>
 * ```
 */
const Primitive = NODES.reduce((primitive, node) => {
  const Node = forwardRef((props: PrimitivePropsWithRef<typeof node>, forwardedRef) => {
    const { asChild, ...primitiveProps } = props
    const Comp = asChild ? Slot : node

    if (typeof window !== 'undefined') {
      // Client-side: set the ref
      const symbolKey = Symbol.for('radix-ui.primitive.' + node)
      ;(window as unknown as Record<symbol, unknown>)[symbolKey] = true
    }

    return createElement(Comp, { ...primitiveProps, ref: forwardedRef } as Record<string, unknown>)
  })

  Node.displayName = `Primitive.${node}`

  return { ...primitive, [node]: Node }
}, {} as Primitives)

/* -------------------------------------------------------------------------------------------------
 * Utils
 * -----------------------------------------------------------------------------------------------*/

/**
 * Dispatches a custom event on a target element.
 * Useful for implementing custom form elements.
 */
function dispatchDiscreteCustomEvent<E extends CustomEvent>(
  target: E['target'],
  event: E
): boolean {
  if (target) {
    return target.dispatchEvent(event)
  }
  return false
}

export { Primitive, dispatchDiscreteCustomEvent }
export type { PrimitivePropsWithRef }
