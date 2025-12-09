import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useControllableState } from '@mdxui/jsx/hooks'
import { composeEventHandlers } from '@mdxui/jsx/utils'

/* -------------------------------------------------------------------------------------------------
 * Toggle
 * -----------------------------------------------------------------------------------------------*/

const NAME = 'Toggle'

type ToggleElement = ElementRef<typeof Primitive.button>
interface ToggleProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'pressed' | 'defaultPressed'> {
  /**
   * The controlled pressed state of the toggle.
   */
  pressed?: boolean
  /**
   * The pressed state when initially rendered. Use when you do not need to control the state.
   */
  defaultPressed?: boolean
  /**
   * Event handler called when the pressed state changes.
   */
  onPressedChange?(pressed: boolean): void
}

/**
 * Toggle is a two-state button that can be either on or off.
 *
 * @example
 * ```tsx
 * <Toggle pressed={isPressed} onPressedChange={setIsPressed}>
 *   <BoldIcon />
 * </Toggle>
 * ```
 */
const Toggle = forwardRef<ToggleElement, ToggleProps>((props, forwardedRef) => {
  const { pressed: pressedProp, defaultPressed = false, onPressedChange, ...toggleProps } = props

  const [pressed = false, setPressed] = useControllableState({
    prop: pressedProp,
    defaultProp: defaultPressed,
    onChange: onPressedChange,
  })

  return (
    <Primitive.button
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      data-disabled={props.disabled ? '' : undefined}
      {...toggleProps}
      ref={forwardedRef}
      onClick={composeEventHandlers(props.onClick, () => {
        if (!props.disabled) {
          setPressed(!pressed)
        }
      })}
    />
  )
})

Toggle.displayName = NAME

/* ---------------------------------------------------------------------------------------------- */

const Root = Toggle

export {
  Toggle,
  Root,
}
export type { ToggleProps }
