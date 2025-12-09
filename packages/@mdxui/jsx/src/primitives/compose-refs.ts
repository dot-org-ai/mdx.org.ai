import type { Ref, MutableRefObject } from '../react'

type PossibleRef<T> = Ref<T> | undefined

/**
 * Set a ref to a value. Handles both callback refs and RefObjects.
 */
function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref !== null && ref !== undefined) {
    ;(ref as MutableRefObject<T>).current = value
  }
}

/**
 * Compose multiple refs into a single ref callback.
 * Useful when you need to forward refs to multiple targets.
 *
 * @param refs - The refs to compose
 * @returns A callback ref that sets all the provided refs
 */
export function composeRefs<T>(...refs: PossibleRef<T>[]): (node: T) => void {
  return (node) => refs.forEach((ref) => setRef(ref, node))
}

/**
 * A hook that composes multiple refs into one.
 * Useful when you need to forward a ref to multiple targets.
 *
 * @param refs - The refs to compose
 * @returns A callback ref that sets all the provided refs
 */
export function useComposedRefs<T>(...refs: PossibleRef<T>[]): (node: T) => void {
  // We could memoize this but it's not necessary for most use cases
  return composeRefs(...refs)
}
