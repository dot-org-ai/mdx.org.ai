import { useRef, useEffect } from '../react'

/**
 * A custom hook that returns the previous value of a variable.
 *
 * @param value - The value to track
 * @returns The previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
