/**
 * @mdxui/headless - Field component
 * A headless field/fieldset component for grouping form controls
 * API compatible with @headlessui/react Field/Fieldset
 */

import {
  forwardRef,
  createContext,
  useContext,
  useMemo,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface FieldContextValue {
  disabled: boolean
  labelId: string
  descriptionId: string
  errorId: string
}

const FieldContext = createContext<FieldContextValue | null>(null)

export function useFieldContext() {
  return useContext(FieldContext)
}

/* -------------------------------------------------------------------------------------------------
 * Fieldset
 * -----------------------------------------------------------------------------------------------*/

type FieldsetElement = HTMLFieldSetElement
interface FieldsetProps extends ComponentPropsWithoutRef<'fieldset'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  disabled?: boolean
}

const Fieldset = forwardRef<FieldsetElement, FieldsetProps>(
  ({ disabled = false, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        disabled={disabled}
        data-headlessui-state={disabled ? 'disabled' : ''}
        data-disabled={disabled ? '' : undefined}
        {...props}
      />
    )
  }
)
Fieldset.displayName = 'Fieldset'

/* -------------------------------------------------------------------------------------------------
 * Legend
 * -----------------------------------------------------------------------------------------------*/

type LegendElement = HTMLLegendElement
interface LegendProps extends ComponentPropsWithoutRef<'legend'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const Legend = forwardRef<LegendElement, LegendProps>((props, ref) => {
  return <legend ref={ref} {...props} />
})
Legend.displayName = 'Legend'

/* -------------------------------------------------------------------------------------------------
 * Field
 * -----------------------------------------------------------------------------------------------*/

type FieldElement = ElementRef<typeof Primitive.div>
interface FieldProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  disabled?: boolean
}

const Field = forwardRef<FieldElement, FieldProps>(
  ({ disabled = false, children, ...props }, ref) => {
    const labelId = useId()
    const descriptionId = useId()
    const errorId = useId()

    const contextValue = useMemo(
      () => ({
        disabled,
        labelId,
        descriptionId,
        errorId,
      }),
      [disabled, labelId, descriptionId, errorId]
    )

    return (
      <FieldContext.Provider value={contextValue}>
        <Primitive.div
          ref={ref}
          data-headlessui-state={disabled ? 'disabled' : ''}
          data-disabled={disabled ? '' : undefined}
          {...props}
        >
          {children}
        </Primitive.div>
      </FieldContext.Provider>
    )
  }
)
Field.displayName = 'Field'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

export { Fieldset, Legend, Field }
export type { FieldsetProps, LegendProps, FieldProps }
