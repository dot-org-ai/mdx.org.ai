/**
 * aria-hidden utilities
 *
 * Lightweight replacement for the aria-hidden package.
 * Used to hide non-modal content from screen readers.
 */

type Undo = () => void

const MARKER = 'data-aria-hidden'
const counterMap = new WeakMap<Element, number>()

/**
 * Hides all siblings of the target element from screen readers.
 * Returns a function to restore visibility.
 *
 * @param targets - Elements that should remain visible
 * @param parentNode - Parent node to traverse (defaults to document.body)
 * @returns A function to restore aria-hidden states
 */
export function hideOthers(
  targets: Element | Element[],
  parentNode: Element = document.body
): Undo {
  const targetsArray = Array.isArray(targets) ? targets : [targets]
  const hiddenElements: Element[] = []

  const walk = (parent: Element) => {
    Array.from(parent.children).forEach((child) => {
      // Skip if it's one of our targets or contains a target
      if (
        targetsArray.some(
          (target) => child === target || child.contains(target)
        )
      ) {
        // Walk into this element to hide its non-target siblings
        walk(child)
        return
      }

      // Skip elements that are already hidden or are script/style tags
      const tagName = child.tagName.toLowerCase()
      if (tagName === 'script' || tagName === 'style') {
        return
      }

      // Track reference count for nested hideOthers calls
      const currentCount = counterMap.get(child) || 0
      if (currentCount === 0) {
        // First time hiding this element
        if (child.getAttribute('aria-hidden') !== 'true') {
          child.setAttribute('aria-hidden', 'true')
          child.setAttribute(MARKER, '')
          hiddenElements.push(child)
        }
      }
      counterMap.set(child, currentCount + 1)
    })
  }

  walk(parentNode)

  return () => {
    hiddenElements.forEach((element) => {
      const count = counterMap.get(element) || 1
      if (count === 1) {
        // Last reference, restore visibility
        element.removeAttribute('aria-hidden')
        element.removeAttribute(MARKER)
        counterMap.delete(element)
      } else {
        counterMap.set(element, count - 1)
      }
    })
  }
}

/**
 * Inert utility - makes an element inert (non-interactive).
 * Returns a function to restore interactivity.
 *
 * @param element - Element to make inert
 * @returns A function to restore the element
 */
export function inertOthers(
  targets: Element | Element[],
  parentNode: Element = document.body
): Undo {
  const targetsArray = Array.isArray(targets) ? targets : [targets]
  const inertElements: Element[] = []

  const walk = (parent: Element) => {
    Array.from(parent.children).forEach((child) => {
      if (
        targetsArray.some(
          (target) => child === target || child.contains(target)
        )
      ) {
        walk(child)
        return
      }

      const tagName = child.tagName.toLowerCase()
      if (tagName === 'script' || tagName === 'style') {
        return
      }

      if (child instanceof HTMLElement && !child.inert) {
        child.inert = true
        inertElements.push(child)
      }
    })
  }

  walk(parentNode)

  return () => {
    inertElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.inert = false
      }
    })
  }
}
