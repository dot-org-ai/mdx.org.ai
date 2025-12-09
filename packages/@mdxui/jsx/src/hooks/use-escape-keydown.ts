import { useEffect } from '../react'
import { useCallbackRef } from './use-callback-ref'

/**
 * A custom hook that listens for the Escape key being pressed.
 *
 * @param onEscapeKeyDown - Callback to execute when Escape is pressed
 * @param ownerDocument - The document to listen on (defaults to global document)
 */
export function useEscapeKeydown(
  onEscapeKeyDown?: (event: KeyboardEvent) => void,
  ownerDocument: Document = globalThis?.document
): void {
  const handleEscapeKeyDown = useCallbackRef(onEscapeKeyDown)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleEscapeKeyDown(event)
      }
    }

    ownerDocument.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [handleEscapeKeyDown, ownerDocument])
}
