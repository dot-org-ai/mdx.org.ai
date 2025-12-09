/**
 * Switch - Toggle switch component using @mdxui/headless
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Switch as HeadlessSwitch } from '@mdxui/headless'

/* -------------------------------------------------------------------------------------------------
 * Switch
 * -----------------------------------------------------------------------------------------------*/

type SwitchElement = HTMLButtonElement
interface SwitchProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'children'> {
  /** Switch color */
  color?: string
  /** Checked state (controlled) */
  checked?: boolean
  /** Default checked state (uncontrolled) */
  defaultChecked?: boolean
  /** On change callback */
  onChange?: (checked: boolean) => void
  children?: React.ReactNode
}

const Switch = forwardRef<SwitchElement, SwitchProps>(
  ({ className = '', color = 'bg-primary', checked, defaultChecked, onChange, ...props }, ref) => {
    return (
      <HeadlessSwitch
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:${color} data-[unchecked]:bg-input ${className}`.trim()}
        {...props}
      >
        <span
          className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[checked]:translate-x-5 data-[unchecked]:translate-x-0"
          data-checked={checked ? '' : undefined}
          data-unchecked={!checked ? '' : undefined}
        />
      </HeadlessSwitch>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
export type { SwitchProps }
