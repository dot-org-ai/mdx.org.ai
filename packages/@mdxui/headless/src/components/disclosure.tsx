/**
 * @mdxui/headless - Disclosure component
 * A headless disclosure/accordion component for showing/hiding content
 * API compatible with @headlessui/react Disclosure
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

type MouseEvent<T = Element> = React.MouseEvent<T>
type KeyboardEvent<T = Element> = React.KeyboardEvent<T>

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface DisclosureContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  buttonId: string
  panelId: string
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null)

function useDisclosureContext(component: string) {
  const context = useContext(DisclosureContext)
  if (!context) {
    throw new Error(`<Disclosure.${component} /> must be used within <Disclosure />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Disclosure Root
 * -----------------------------------------------------------------------------------------------*/

type DisclosureElement = ElementRef<typeof Primitive.div>
interface DisclosureProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'defaultValue' | 'children'> {
  defaultOpen?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean; close: () => void }) => ReactNode)
}

const DisclosureRoot = forwardRef<DisclosureElement, DisclosureProps>(
  ({ children, defaultOpen = false, as: Component = 'div', ...props }, ref) => {
    const [open, setOpen] = useState(defaultOpen)
    const buttonId = useId()
    const panelId = useId()

    const toggle = useCallback(() => {
      setOpen((prev) => !prev)
    }, [])

    const close = useCallback(() => {
      setOpen(false)
    }, [])

    const contextValue = useMemo(
      () => ({
        open,
        setOpen,
        toggle,
        buttonId,
        panelId,
      }),
      [open, toggle, buttonId, panelId]
    )

    const resolvedChildren = typeof children === 'function' ? children({ open, close }) : children

    return (
      <DisclosureContext.Provider value={contextValue}>
        <Primitive.div ref={ref} data-headlessui-state={open ? 'open' : ''} {...props}>
          {resolvedChildren}
        </Primitive.div>
      </DisclosureContext.Provider>
    )
  }
)
DisclosureRoot.displayName = 'Disclosure'

/* -------------------------------------------------------------------------------------------------
 * Disclosure Button
 * -----------------------------------------------------------------------------------------------*/

type DisclosureButtonElement = ElementRef<typeof Primitive.button>
interface DisclosureButtonProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean }) => ReactNode)
}

const DisclosureButton = forwardRef<DisclosureButtonElement, DisclosureButtonProps>(
  ({ children, as: Component = 'button', onClick, onKeyDown, ...props }, ref) => {
    const context = useDisclosureContext('Button')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        context.toggle()
        ;(onClick as any)?.(e)
      },
      [context, onClick]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          context.toggle()
        }
        ;(onKeyDown as any)?.(e)
      },
      [context, onKeyDown]
    )

    const resolvedChildren = typeof children === 'function' ? children({ open: context.open }) : children

    return (
      <Primitive.button
        ref={ref}
        id={context.buttonId}
        type="button"
        aria-expanded={context.open}
        aria-controls={context.panelId}
        data-headlessui-state={context.open ? 'open' : ''}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {resolvedChildren}
      </Primitive.button>
    )
  }
)
DisclosureButton.displayName = 'DisclosureButton'

/* -------------------------------------------------------------------------------------------------
 * Disclosure Panel
 * -----------------------------------------------------------------------------------------------*/

type DisclosurePanelElement = ElementRef<typeof Primitive.div>
interface DisclosurePanelProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  static?: boolean
  unmount?: boolean
  children?: ReactNode | ((props: { open: boolean; close: () => void }) => ReactNode)
}

const DisclosurePanel = forwardRef<DisclosurePanelElement, DisclosurePanelProps>(
  ({ children, static: isStatic = false, unmount = true, ...props }, ref) => {
    const context = useDisclosureContext('Panel')

    const close = useCallback(() => {
      context.setOpen(false)
    }, [context])

    // If unmount is true and panel is closed, don't render
    if (!isStatic && !context.open && unmount) {
      return null
    }

    const resolvedChildren = typeof children === 'function' ? children({ open: context.open, close }) : children

    return (
      <Primitive.div
        ref={ref}
        id={context.panelId}
        aria-labelledby={context.buttonId}
        data-headlessui-state={context.open ? 'open' : ''}
        hidden={!isStatic && !context.open ? true : undefined}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    )
  }
)
DisclosurePanel.displayName = 'DisclosurePanel'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Disclosure = Object.assign(DisclosureRoot, {
  Button: DisclosureButton,
  Panel: DisclosurePanel,
})

export { Disclosure, DisclosureButton, DisclosurePanel }
export type { DisclosureProps, DisclosureButtonProps, DisclosurePanelProps }
