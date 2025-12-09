import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Separator
 * -----------------------------------------------------------------------------------------------*/

const NAME = 'Separator'
const DEFAULT_ORIENTATION = 'horizontal'
const ORIENTATIONS = ['horizontal', 'vertical'] as const

type Orientation = (typeof ORIENTATIONS)[number]

type SeparatorElement = ElementRef<typeof Primitive.div>
interface SeparatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * Either `vertical` or `horizontal`. Defaults to `horizontal`.
   */
  orientation?: Orientation
  /**
   * Whether or not the component is purely decorative. When true, accessibility-related
   * attributes are updated so that the rendered element is removed from the accessibility tree.
   */
  decorative?: boolean
}

/**
 * Separator is a visual divider between content sections.
 *
 * @example
 * ```tsx
 * <Separator orientation="horizontal" />
 * <Separator orientation="vertical" decorative />
 * ```
 */
const Separator = forwardRef<SeparatorElement, SeparatorProps>(
  (props, forwardedRef) => {
    const {
      decorative,
      orientation: orientationProp = DEFAULT_ORIENTATION,
      ...separatorProps
    } = props

    const orientation = isValidOrientation(orientationProp)
      ? orientationProp
      : DEFAULT_ORIENTATION

    // For non-decorative separators, we need to set role and aria-orientation
    const ariaOrientation = orientation === 'vertical' ? orientation : undefined
    const semanticProps = decorative
      ? { role: 'none' }
      : { 'aria-orientation': ariaOrientation, role: 'separator' }

    return (
      <Primitive.div
        data-orientation={orientation}
        {...semanticProps}
        {...separatorProps}
        ref={forwardedRef}
      />
    )
  }
)

Separator.displayName = NAME

/* ---------------------------------------------------------------------------------------------- */

function isValidOrientation(orientation: unknown): orientation is Orientation {
  return ORIENTATIONS.includes(orientation as Orientation)
}

const Root = Separator

export {
  Separator,
  Root,
}
export type { SeparatorProps }
