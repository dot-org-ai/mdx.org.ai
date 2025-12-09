import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type ReactElement,
} from '../react'
import { useLayoutEffect } from '../hooks/use-layout-effect'
import { useCallbackRef } from '../hooks/use-callback-ref'

/* -------------------------------------------------------------------------------------------------
 * Presence
 * -----------------------------------------------------------------------------------------------*/

interface PresenceProps {
  /**
   * Whether the children should be present/visible
   */
  present: boolean
  /**
   * The children to render. Can be a ReactNode or a function that receives the presence state.
   */
  children: ReactNode | ((props: { present: boolean }) => ReactElement | null)
}

/**
 * Presence is a component that manages the mounting/unmounting of its children
 * based on the `present` prop. It's useful for managing exit animations.
 *
 * When `present` changes from true to false, the component will wait for
 * any CSS animations/transitions to complete before unmounting the children.
 *
 * @example
 * ```tsx
 * <Presence present={isOpen}>
 *   <Dialog />
 * </Presence>
 *
 * // Or with a render function for more control
 * <Presence present={isOpen}>
 *   {({ present }) => <Dialog data-state={present ? 'open' : 'closed'} />}
 * </Presence>
 * ```
 */
function Presence({ present, children }: PresenceProps) {
  const presence = usePresence(present)

  const child =
    typeof children === 'function'
      ? children({ present: presence.isPresent })
      : children

  if (!presence.isPresent && !presence.isAnimating) {
    return null
  }

  return child as ReactElement
}

Presence.displayName = 'Presence'

/* -------------------------------------------------------------------------------------------------
 * usePresence
 * -----------------------------------------------------------------------------------------------*/

interface UsePresenceReturn {
  isPresent: boolean
  isAnimating: boolean
  ref: (node: HTMLElement | null) => void
}

/**
 * A hook that manages presence state for animation purposes.
 * Returns whether the element should be present and a ref to attach to the animated element.
 */
function usePresence(present: boolean): UsePresenceReturn {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const stylesRef = useRef<CSSStyleDeclaration | null>(null)
  const prevPresentRef = useRef(present)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleAnimationEnd = useCallback(() => {
    setIsAnimating(false)
  }, [])

  useLayoutEffect(() => {
    if (node) {
      stylesRef.current = getComputedStyle(node)
    }
  }, [node])

  useLayoutEffect(() => {
    const wasPresent = prevPresentRef.current
    const hasAnimationChanged = wasPresent !== present

    if (hasAnimationChanged) {
      const styles = stylesRef.current
      const hasAnimation =
        styles?.animationName && styles.animationName !== 'none'
      const hasTransition =
        styles?.transitionProperty && styles.transitionProperty !== 'none'

      if (present) {
        // Entering: immediately present, no animation tracking needed
        setIsAnimating(false)
      } else if (hasAnimation || hasTransition) {
        // Exiting with animation: keep present until animation ends
        setIsAnimating(true)
      } else {
        // Exiting without animation: immediately hide
        setIsAnimating(false)
      }

      prevPresentRef.current = present
    }
  }, [present])

  // Listen for animation/transition end
  useEffect(() => {
    if (!node || !isAnimating) return

    const handleEnd = () => {
      handleAnimationEnd()
    }

    node.addEventListener('animationend', handleEnd)
    node.addEventListener('transitionend', handleEnd)

    return () => {
      node.removeEventListener('animationend', handleEnd)
      node.removeEventListener('transitionend', handleEnd)
    }
  }, [node, isAnimating, handleAnimationEnd])

  return {
    isPresent: present || isAnimating,
    isAnimating,
    ref: setNode,
  }
}

export { Presence, usePresence }
export type { PresenceProps }
