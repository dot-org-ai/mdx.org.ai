import { useId as reactUseId, useState } from '../react'
import { useLayoutEffect } from './use-layout-effect'

let count = 0

/**
 * A custom hook that generates a unique ID.
 * Uses React's useId when available, falls back to a custom implementation.
 *
 * @param deterministicId - An optional deterministic ID to use instead
 * @returns A unique ID string
 */
export function useId(deterministicId?: string): string {
  // Try to use React's built-in useId if available
  if (reactUseId) {
    const id = reactUseId()
    return deterministicId ?? id
  }

  // Fallback implementation for older React versions or Hono
  const [id, setId] = useState<string | undefined>(deterministicId)

  useLayoutEffect(() => {
    if (!deterministicId) {
      setId(`mdxui-${++count}`)
    }
  }, [deterministicId])

  return deterministicId ?? id ?? ''
}
