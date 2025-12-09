import { createContext, useContext } from '../react'

type Direction = 'ltr' | 'rtl'

const DirectionContext = createContext<Direction | undefined>(undefined)

export const DirectionProvider = DirectionContext.Provider

/**
 * A custom hook that returns the current text direction (ltr or rtl).
 *
 * @param localDir - A local direction override
 * @returns The current direction
 */
export function useDirection(localDir?: Direction): Direction {
  const globalDir = useContext(DirectionContext)
  return localDir ?? globalDir ?? 'ltr'
}
