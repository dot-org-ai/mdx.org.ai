/**
 * @mdxui/headless - Description component
 * A headless description component
 * API compatible with @headlessui/react Description
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useFieldContext } from './field'

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/

type DescriptionElement = ElementRef<typeof Primitive.p>
interface DescriptionProps extends ComponentPropsWithoutRef<typeof Primitive.p> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const Description = forwardRef<DescriptionElement, DescriptionProps>((props, ref) => {
  const fieldContext = useFieldContext()

  return (
    <Primitive.p
      ref={ref}
      id={fieldContext?.descriptionId}
      data-headlessui-state={fieldContext?.disabled ? 'disabled' : ''}
      data-disabled={fieldContext?.disabled ? '' : undefined}
      {...props}
    />
  )
})
Description.displayName = 'Description'

export { Description }
export type { DescriptionProps }
