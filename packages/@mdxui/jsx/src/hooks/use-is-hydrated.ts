import { useState, useEffect, useSyncExternalStore } from '../react'

/**
 * A custom hook that returns true when the component has been hydrated on the client.
 * Useful for avoiding hydration mismatches.
 *
 * @returns true when hydrated on the client, false during SSR
 */
export function useIsHydrated(): boolean {
  // Try to use useSyncExternalStore for more reliable hydration detection
  if (useSyncExternalStore) {
    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    )
  }

  // Fallback for environments without useSyncExternalStore
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

function subscribe(onStoreChange: () => void): () => void {
  // We don't need to subscribe to anything, hydration only happens once
  return () => {}
}

function getSnapshot(): boolean {
  return true
}

function getServerSnapshot(): boolean {
  return false
}
