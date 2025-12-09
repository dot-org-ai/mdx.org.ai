import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Label
 * -----------------------------------------------------------------------------------------------*/

const NAME = 'Label'

type LabelElement = ElementRef<typeof Primitive.label>
interface LabelProps extends ComponentPropsWithoutRef<typeof Primitive.label> {
  /**
   * The id of the element the label is associated with.
   */
  htmlFor?: string
}

/**
 * Label is an accessible label for form controls.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email</Label>
 * <input id="email" type="email" />
 * ```
 */
const Label = forwardRef<LabelElement, LabelProps>((props, forwardedRef) => {
  return (
    <Primitive.label
      {...props}
      ref={forwardedRef}
      onMouseDown={(event) => {
        // Only prevent text selection if clicking inside the label itself
        const target = event.target as HTMLElement
        if (target.closest('button, input, select, textarea')) return

        props.onMouseDown?.(event)
        // Prevent text selection when double clicking label
        if (!event.defaultPrevented && event.detail > 1) {
          event.preventDefault()
        }
      }}
    />
  )
})

Label.displayName = NAME

/* ---------------------------------------------------------------------------------------------- */

const Root = Label

export {
  Label,
  Root,
}
export type { LabelProps }
