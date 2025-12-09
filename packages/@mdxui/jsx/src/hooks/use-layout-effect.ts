import { useLayoutEffect as reactUseLayoutEffect, useEffect } from '../react'

/**
 * SSR-safe useLayoutEffect that falls back to useEffect on the server.
 * This prevents the "useLayoutEffect does nothing on the server" warning.
 */
export const useLayoutEffect =
  typeof document !== 'undefined' ? reactUseLayoutEffect : useEffect
