import { useEffect, type ReactNode } from '@mdxui/jsx'

/* -------------------------------------------------------------------------------------------------
 * RemoveScroll
 * -----------------------------------------------------------------------------------------------*/

interface RemoveScrollProps {
  /**
   * The content to render while scroll is locked
   */
  children: ReactNode
  /**
   * Whether scroll locking is enabled
   */
  enabled?: boolean
  /**
   * Whether to allow touch move events
   */
  allowPinchZoom?: boolean
  /**
   * Whether to remove scroll from all scrollable containers
   */
  removeScrollBar?: boolean
  /**
   * Callback when an attempt to scroll is made while locked
   */
  onScrollCapture?: () => void
}

/**
 * RemoveScroll is a lightweight replacement for react-remove-scroll.
 * It prevents scrolling on the body when enabled.
 *
 * @example
 * ```tsx
 * <RemoveScroll enabled={isOpen}>
 *   <Dialog />
 * </RemoveScroll>
 * ```
 */
function RemoveScroll({
  children,
  enabled = true,
  allowPinchZoom = false,
  removeScrollBar = true,
}: RemoveScrollProps) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return

    const html = document.documentElement
    const body = document.body

    // Store original styles
    const originalHtmlOverflow = html.style.overflow
    const originalBodyOverflow = body.style.overflow
    const originalBodyPaddingRight = body.style.paddingRight
    const originalHtmlPaddingRight = html.style.paddingRight

    // Calculate scrollbar width
    const scrollbarWidth = window.innerWidth - html.clientWidth

    // Lock scroll
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    // Compensate for scrollbar removal to prevent layout shift
    if (removeScrollBar && scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
      html.style.paddingRight = `${scrollbarWidth}px`
    }

    // Prevent touch move on iOS
    const handleTouchMove = (e: TouchEvent) => {
      if (!allowPinchZoom && e.touches.length > 1) {
        return // Allow pinch zoom
      }

      const target = e.target as HTMLElement | null
      if (target) {
        // Allow scrolling inside scrollable elements
        const isScrollable = (el: HTMLElement): boolean => {
          const style = window.getComputedStyle(el)
          return (
            style.overflow === 'auto' ||
            style.overflow === 'scroll' ||
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll'
          )
        }

        let currentEl: HTMLElement | null = target
        while (currentEl && currentEl !== body) {
          if (isScrollable(currentEl)) {
            return // Allow scrolling in scrollable children
          }
          currentEl = currentEl.parentElement
        }
      }

      e.preventDefault()
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })

    // Cleanup
    return () => {
      html.style.overflow = originalHtmlOverflow
      body.style.overflow = originalBodyOverflow
      body.style.paddingRight = originalBodyPaddingRight
      html.style.paddingRight = originalHtmlPaddingRight
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [enabled, allowPinchZoom, removeScrollBar])

  return children
}

/* -------------------------------------------------------------------------------------------------
 * useRemoveScroll hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * A hook that removes scroll when enabled.
 *
 * @param enabled - Whether scroll should be removed
 */
function useRemoveScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return

    const html = document.documentElement
    const body = document.body

    const originalHtmlOverflow = html.style.overflow
    const originalBodyOverflow = body.style.overflow
    const originalBodyPaddingRight = body.style.paddingRight

    const scrollbarWidth = window.innerWidth - html.clientWidth

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      html.style.overflow = originalHtmlOverflow
      body.style.overflow = originalBodyOverflow
      body.style.paddingRight = originalBodyPaddingRight
    }
  }, [enabled])
}

export { RemoveScroll, useRemoveScroll }
export type { RemoveScrollProps }
