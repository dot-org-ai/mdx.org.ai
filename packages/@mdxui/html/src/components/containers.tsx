/**
 * Container Components
 *
 * React wrappers for semantic HTML overlay containers.
 * Modal, Drawer, Toast, Card, Alert, etc.
 */

import * as React from 'react'

/* ==========================================================================
   Modal / Dialog
   ========================================================================== */

export interface ModalProps {
  /** Control open state */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Content */
  children: React.ReactNode
  /** Footer actions */
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  const handleClose = () => {
    onClose()
  }

  return (
    <dialog ref={dialogRef} data-size={size} onClose={handleClose}>
      <article>
        {title && (
          <header>
            <h2>{title}</h2>
            <button aria-label="Close" onClick={handleClose}>
              &times;
            </button>
          </header>
        )}
        <section>{children}</section>
        {footer && <footer>{footer}</footer>}
      </article>
    </dialog>
  )
}

/* ==========================================================================
   Drawer / Slideover
   ========================================================================== */

export interface DrawerProps {
  /** Control open state */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Drawer title */
  title?: string
  /** Position */
  position?: 'right' | 'left' | 'top' | 'bottom'
  /** Content */
  children: React.ReactNode
  /** Footer actions */
  footer?: React.ReactNode
}

export function Drawer({
  open,
  onClose,
  title,
  position = 'right',
  children,
  footer,
}: DrawerProps) {
  if (!open) return null

  return (
    <aside data-container="drawer" data-position={position} onClick={onClose}>
      <article onClick={(e) => e.stopPropagation()}>
        {title && (
          <header>
            <h2>{title}</h2>
            <button aria-label="Close" onClick={onClose}>
              &times;
            </button>
          </header>
        )}
        <section>{children}</section>
        {footer && <footer>{footer}</footer>}
      </article>
    </aside>
  )
}

/* ==========================================================================
   Toast / Notification
   ========================================================================== */

export interface Toast {
  id: string
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
}

export interface ToastContainerProps {
  /** List of toasts */
  toasts: Toast[]
  /** Position on screen */
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center'
  /** Dismiss handler */
  onDismiss?: (id: string) => void
}

export function ToastContainer({
  toasts,
  position = 'bottom-right',
  onDismiss,
}: ToastContainerProps) {
  return (
    <div aria-live="polite" data-position={position}>
      {toasts.map((toast) => (
        <article key={toast.id} data-type={toast.type}>
          <div>
            {toast.title && <h4>{toast.title}</h4>}
            <p>{toast.message}</p>
          </div>
          {onDismiss && (
            <button aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
              &times;
            </button>
          )}
        </article>
      ))}
    </div>
  )
}

/* ==========================================================================
   Alert (Inline)
   ========================================================================== */

export interface AlertProps {
  /** Alert type */
  type?: 'success' | 'error' | 'warning' | 'info'
  /** Alert title */
  title?: string
  /** Alert message */
  children: React.ReactNode
  /** Optional icon */
  icon?: React.ReactNode
}

export function Alert({ type, title, children, icon }: AlertProps) {
  return (
    <div role="alert" data-type={type}>
      {icon}
      <div>
        {title && <h4>{title}</h4>}
        <p>{children}</p>
      </div>
    </div>
  )
}

/* ==========================================================================
   Card
   ========================================================================== */

export interface CardProps {
  /** Card title */
  title?: string
  /** Card description */
  description?: string
  /** Header image */
  image?: string
  /** Make card clickable */
  interactive?: boolean
  /** Click handler */
  onClick?: () => void
  /** Content */
  children?: React.ReactNode
  /** Footer content */
  footer?: React.ReactNode
}

export function Card({
  title,
  description,
  image,
  interactive,
  onClick,
  children,
  footer,
}: CardProps) {
  return (
    <article
      data-container="card"
      data-interactive={interactive || undefined}
      onClick={onClick}
    >
      {image && <img src={image} alt={title || ''} />}
      {(title || description) && (
        <header>
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </header>
      )}
      {children && <section>{children}</section>}
      {footer && <footer>{footer}</footer>}
    </article>
  )
}

/* ==========================================================================
   Dropdown Menu
   ========================================================================== */

export interface DropdownItem {
  id: string
  label: string
  icon?: React.ReactNode
  destructive?: boolean
  onClick?: () => void
  href?: string
  divider?: boolean
}

export interface DropdownProps {
  /** Control open state */
  open: boolean
  /** List of items */
  items: DropdownItem[]
  /** Close handler */
  onClose?: () => void
}

export function Dropdown({ open, items, onClose }: DropdownProps) {
  if (!open) return null

  return (
    <menu role="menu" onClick={onClose}>
      {items.map((item) =>
        item.divider ? (
          <hr key={item.id} />
        ) : item.href ? (
          <li key={item.id}>
            <a href={item.href} data-destructive={item.destructive || undefined}>
              {item.icon}
              {item.label}
            </a>
          </li>
        ) : (
          <li key={item.id}>
            <button
              onClick={item.onClick}
              data-destructive={item.destructive || undefined}
            >
              {item.icon}
              {item.label}
            </button>
          </li>
        )
      )}
    </menu>
  )
}

/* ==========================================================================
   Tooltip
   ========================================================================== */

export interface TooltipProps {
  /** Tooltip content */
  content: string
  /** Wrapped element */
  children: React.ReactElement
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLElement>(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
    setVisible(true)
  }

  const handleMouseLeave = () => {
    setVisible(false)
  }

  return (
    <>
      {React.cloneElement(children, {
        ref: triggerRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      })}
      {visible && (
        <div
          data-container="tooltip"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

/* ==========================================================================
   Tabs
   ========================================================================== */

export interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

export interface TabsProps {
  /** List of tabs */
  tabs: Tab[]
  /** Active tab ID */
  activeTab?: string
  /** Tab change handler */
  onChange?: (tabId: string) => void
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
}

export function Tabs({ tabs, activeTab, onChange, orientation = 'horizontal' }: TabsProps) {
  const [active, setActive] = React.useState(activeTab || tabs[0]?.id)

  const handleChange = (tabId: string) => {
    setActive(tabId)
    onChange?.(tabId)
  }

  const currentTab = tabs.find((tab) => tab.id === active)

  return (
    <div>
      <nav
        role="tablist"
        data-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === active}
            onClick={() => handleChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div role="tabpanel">{currentTab?.content}</div>
    </div>
  )
}
