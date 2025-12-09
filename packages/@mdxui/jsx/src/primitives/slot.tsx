import {
  forwardRef,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ReactElement,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
} from '../react'
import { composeRefs } from './compose-refs'

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

type AnyProps = Record<string, unknown>

/* -------------------------------------------------------------------------------------------------
 * Slot
 * -----------------------------------------------------------------------------------------------*/

// Using a more flexible type that allows any HTML element props to be passed through
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SlotProps extends React.HTMLAttributes<any> {
  children?: ReactNode
}

/**
 * Slot is a component that merges its props onto its immediate child.
 * It's used to implement the `asChild` pattern in Radix components.
 *
 * When used, the Slot passes all its props to its single child element,
 * merging event handlers, className, style, and ref.
 */
const Slot = forwardRef<HTMLElement, SlotProps>((props, forwardedRef) => {
  const { children, ...slotProps } = props
  const childrenArray = Children.toArray(children)
  const slottable = childrenArray.find(isSlottable)

  if (slottable) {
    // The new element to render is the one passed as a child of `Slottable`
    const newElement = slottable.props.children as ReactNode

    const newChildren = childrenArray.map((child) => {
      if (child === slottable) {
        // Because the new element will be the one rendered, we are only interested
        // in grabbing its children (`newElement.props.children`)
        if (Children.count(newElement) > 1) return Children.only(null)
        return isValidElement(newElement)
          ? (newElement.props.children as ReactNode)
          : null
      }
      return child
    })

    return (
      <SlotClone {...slotProps} ref={forwardedRef}>
        {isValidElement(newElement)
          ? cloneElement(newElement, undefined, newChildren)
          : null}
      </SlotClone>
    )
  }

  return (
    <SlotClone {...slotProps} ref={forwardedRef}>
      {children}
    </SlotClone>
  )
})

Slot.displayName = 'Slot'

/* -------------------------------------------------------------------------------------------------
 * SlotClone
 * -----------------------------------------------------------------------------------------------*/

interface SlotCloneProps {
  children: ReactNode
  [key: string]: unknown
}

const SlotClone = forwardRef<HTMLElement, SlotCloneProps>(
  (props, forwardedRef) => {
    const { children, ...slotProps } = props

    if (isValidElement(children)) {
      const childRef = getElementRef(children)
      const childProps = (children.props ?? {}) as AnyProps
      return cloneElement(children, {
        ...mergeProps(slotProps, childProps),
        ref: forwardedRef
          ? composeRefs(forwardedRef, childRef)
          : childRef,
      } as Record<string, unknown>)
    }

    return Children.count(children) > 1 ? Children.only(null) : null
  }
)

SlotClone.displayName = 'SlotClone'

/* -------------------------------------------------------------------------------------------------
 * Slottable
 * -----------------------------------------------------------------------------------------------*/

interface SlottableProps {
  children: ReactNode
}

const Slottable = ({ children }: SlottableProps) => {
  return <>{children}</>
}

/* -------------------------------------------------------------------------------------------------
 * Utilities
 * -----------------------------------------------------------------------------------------------*/

function isSlottable(child: ReactNode): child is ReactElement<SlottableProps> {
  return isValidElement(child) && child.type === Slottable
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  // All child props should override slot props
  const overrideProps = { ...childProps }

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]

    const isHandler = /^on[A-Z]/.test(propName)
    if (isHandler) {
      // If the handler exists on both, compose them
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args: unknown[]) => {
          ;(childPropValue as (...args: unknown[]) => void)(...args)
          ;(slotPropValue as (...args: unknown[]) => void)(...args)
        }
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue
      }
    } else if (propName === 'style') {
      overrideProps[propName] = { ...slotPropValue as object, ...childPropValue as object }
    } else if (propName === 'className') {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(' ')
    }
  }

  return { ...slotProps, ...overrideProps }
}

function getElementRef(element: ReactElement): ForwardedRef<unknown> {
  // React >= 19
  if ('ref' in element.props) {
    return element.props.ref as ForwardedRef<unknown>
  }

  // React < 19
  // @ts-expect-error - ref exists on element
  return element.ref
}

export { Slot, Slottable }
export type { SlotProps }
