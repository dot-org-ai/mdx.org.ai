import { useState } from '../react'
import { useLayoutEffect } from './use-layout-effect'

interface Size {
  width: number
  height: number
}

/**
 * A custom hook that tracks the size of an element using ResizeObserver.
 *
 * @param element - The element to observe
 * @returns The current size of the element
 */
export function useSize(element: HTMLElement | null): Size | undefined {
  const [size, setSize] = useState<Size | undefined>(undefined)

  useLayoutEffect(() => {
    if (element) {
      // Set initial size
      setSize({ width: element.offsetWidth, height: element.offsetHeight })

      const resizeObserver = new ResizeObserver((entries) => {
        if (!Array.isArray(entries)) return
        if (!entries.length) return

        const entry = entries[0]
        if (!entry) return

        let width: number
        let height: number

        if ('borderBoxSize' in entry) {
          const borderSizeEntry = entry.borderBoxSize
          // Check for old Firefox behavior
          const borderSize = Array.isArray(borderSizeEntry)
            ? borderSizeEntry[0]
            : borderSizeEntry
          width = borderSize.inlineSize
          height = borderSize.blockSize
        } else {
          // Fallback for older browsers
          width = element.offsetWidth
          height = element.offsetHeight
        }

        setSize({ width, height })
      })

      resizeObserver.observe(element, { box: 'border-box' })

      return () => {
        resizeObserver.unobserve(element)
      }
    }
    return undefined
  }, [element])

  return size
}
