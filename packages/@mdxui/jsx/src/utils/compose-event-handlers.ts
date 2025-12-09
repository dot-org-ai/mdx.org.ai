/**
 * Composes multiple event handlers into a single handler.
 * The original handler is called first, then the custom handler.
 * If the original handler calls `event.preventDefault()`, the custom handler won't be called.
 *
 * @param originalEventHandler - The original event handler from the component
 * @param ourEventHandler - The custom event handler to compose
 * @param checkForDefaultPrevented - Whether to check if default was prevented (default: true)
 */
export function composeEventHandlers<E>(
  originalEventHandler?: (event: E) => void,
  ourEventHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {}
): (event: E) => void {
  return function handleEvent(event: E) {
    originalEventHandler?.(event)

    if (
      checkForDefaultPrevented === false ||
      !(event as unknown as { defaultPrevented: boolean }).defaultPrevented
    ) {
      ourEventHandler?.(event)
    }
  }
}
