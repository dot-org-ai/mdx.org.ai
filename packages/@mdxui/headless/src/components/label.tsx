/**
 * @mdxui/headless - Label component
 * A headless label component
 * API compatible with @headlessui/react Label
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useFieldContext } from './field'

/* -------------------------------------------------------------------------------------------------
 * Label
 * -----------------------------------------------------------------------------------------------*/

type LabelElement = ElementRef<typeof Primitive.label>
interface LabelProps extends ComponentPropsWithoutRef<typeof Primitive.label> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  passive?: boolean
}

const Label = forwardRef<LabelElement, LabelProps>(
  ({ passive = false, ...props }, ref) => {
    const fieldContext = useFieldContext()

    return (
      <Primitive.label
        ref={ref}
        id={fieldContext?.labelId}
        data-headlessui-state={fieldContext?.disabled ? 'disabled' : ''}
        data-disabled={fieldContext?.disabled ? '' : undefined}
        {...props}
      />
    )
  }
)
Label.displayName = 'Label'

export { Label }
export type { LabelProps }
