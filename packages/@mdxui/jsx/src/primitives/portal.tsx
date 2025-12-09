import { useState, type ReactNode } from '../react'
import { createPortal } from '../react'
import { useLayoutEffect } from '../hooks/use-layout-effect'
import { Primitive } from './primitive'

/* -------------------------------------------------------------------------------------------------
 * Portal
 * -----------------------------------------------------------------------------------------------*/

const PORTAL_NAME = 'Portal'

interface PortalProps {
  /**
   * The content to render in the portal
   */
  children?: ReactNode
  /**
   * An optional container where the portalled content should be appended.
   * If not provided, the content is appended to document.body.
   */
  container?: HTMLElement | null
}

/**
 * Portal renders its children in a different part of the DOM tree.
 * By default, it renders children as a sibling to the app root.
 *
 * @example
 * ```tsx
 * <Portal>
 *   <div>This will be rendered at the end of document.body</div>
 * </Portal>
 *
 * <Portal container={customContainer}>
 *   <div>This will be rendered in customContainer</div>
 * </Portal>
 * ```
 */
function Portal({ container, children }: PortalProps) {
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const portalContainer = container ?? (typeof document !== 'undefined' ? document.body : null)

  if (!portalContainer) {
    return null
  }

  return createPortal(children, portalContainer) as React.ReactElement
}

Portal.displayName = PORTAL_NAME

export { Portal }
export type { PortalProps }
