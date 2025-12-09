import { useState } from '../react'
import { useLayoutEffect } from './use-layout-effect'

/**
 * A measured DOMRect-like object
 */
interface Measurable {
  getBoundingClientRect(): DOMRect
}

/**
 * A custom hook that tracks the bounding rect of an element.
 *
 * @param measurable - The element to measure
 * @returns The current bounding rect of the element
 */
export function useRect(measurable: Measurable | null): DOMRect | undefined {
  const [rect, setRect] = useState<DOMRect>()

  useLayoutEffect(() => {
    if (measurable) {
      const updateRect = () => {
        setRect(measurable.getBoundingClientRect())
      }

      updateRect()

      // Use ResizeObserver if the measurable is an Element
      if (measurable instanceof Element) {
        const resizeObserver = new ResizeObserver(updateRect)
        resizeObserver.observe(measurable)

        return () => {
          resizeObserver.disconnect()
        }
      }
    }
    return undefined
  }, [measurable])

  return rect
}
