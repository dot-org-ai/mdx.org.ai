import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * VisuallyHidden
 * -----------------------------------------------------------------------------------------------*/

const NAME = 'VisuallyHidden'

type VisuallyHiddenElement = ElementRef<typeof Primitive.span>
interface VisuallyHiddenProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}

/**
 * VisuallyHidden hides content from the screen but keeps it accessible to screen readers.
 * Useful for providing accessible labels without visible text.
 *
 * @example
 * ```tsx
 * <button>
 *   <VisuallyHidden>Save</VisuallyHidden>
 *   <SaveIcon />
 * </button>
 * ```
 */
const VisuallyHidden = forwardRef<VisuallyHiddenElement, VisuallyHiddenProps>(
  (props, forwardedRef) => {
    return (
      <Primitive.span
        {...props}
        ref={forwardedRef}
        style={{
          // Standard visually hidden styles
          position: 'absolute',
          border: 0,
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          wordWrap: 'normal',
          ...props.style,
        }}
      />
    )
  }
)

VisuallyHidden.displayName = NAME

/* ---------------------------------------------------------------------------------------------- */

const Root = VisuallyHidden

export {
  VisuallyHidden,
  Root,
}
export type { VisuallyHiddenProps }
