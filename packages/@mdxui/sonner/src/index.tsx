/**
 * @mdxui/sonner - Toast notification component
 * A toast notification system built on @mdxui/jsx primitives
 * Port of sonner (https://github.com/emilkowalski/sonner) for Hono JSX compatibility
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'

type CSSProperties = React.CSSProperties
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'
type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

interface ToastData {
  id: string | number
  type: ToastType
  title?: ReactNode
  description?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  cancel?: {
    label: string
    onClick: () => void
  }
  duration?: number
  dismissible?: boolean
  icon?: ReactNode
  promise?: Promise<unknown>
  onDismiss?: (toast: ToastData) => void
  onAutoClose?: (toast: ToastData) => void
}

interface ToasterProps extends ComponentPropsWithoutRef<typeof Primitive.ol> {
  position?: Position
  hotkey?: string[]
  richColors?: boolean
  expand?: boolean
  duration?: number
  gap?: number
  visibleToasts?: number
  closeButton?: boolean
  toastOptions?: {
    className?: string
    descriptionClassName?: string
    style?: CSSProperties
    cancelButtonStyle?: CSSProperties
    actionButtonStyle?: CSSProperties
    duration?: number
    unstyled?: boolean
  }
  offset?: string | number
  dir?: 'ltr' | 'rtl' | 'auto'
  theme?: 'light' | 'dark' | 'system'
  icons?: {
    success?: ReactNode
    info?: ReactNode
    warning?: ReactNode
    error?: ReactNode
    loading?: ReactNode
    close?: ReactNode
  }
  containerAriaLabel?: string
  pauseWhenPageIsHidden?: boolean
}

interface ToastState {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, 'id'>) => string | number
  removeToast: (id: string | number) => void
  dismissToast: (id: string | number) => void
}

/* -------------------------------------------------------------------------------------------------
 * Toast State Management
 * -----------------------------------------------------------------------------------------------*/

let toastId = 0
const generateId = () => ++toastId

const subscribers = new Set<(toasts: ToastData[]) => void>()
let toasts: ToastData[] = []

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber([...toasts]))
}

function addToast(toast: Omit<ToastData, 'id'>): string | number {
  const id = generateId()
  const newToast: ToastData = { ...toast, id }
  toasts = [...toasts, newToast]
  notifySubscribers()
  return id
}

function removeToast(id: string | number) {
  const toast = toasts.find((t) => t.id === id)
  toasts = toasts.filter((t) => t.id !== id)
  notifySubscribers()
  if (toast?.onDismiss) {
    toast.onDismiss(toast)
  }
}

function dismissToast(id: string | number) {
  removeToast(id)
}

function dismissAll() {
  toasts = []
  notifySubscribers()
}

/* -------------------------------------------------------------------------------------------------
 * Toast Function API
 * -----------------------------------------------------------------------------------------------*/

type ToastOptions = Omit<ToastData, 'id' | 'type'>

function createToast(message: ReactNode, type: ToastType = 'default', options?: ToastOptions) {
  return addToast({
    type,
    title: message,
    ...options,
  })
}

interface ToastFunction {
  (message: ReactNode, options?: ToastOptions): string | number
  success: (message: ReactNode, options?: ToastOptions) => string | number
  error: (message: ReactNode, options?: ToastOptions) => string | number
  warning: (message: ReactNode, options?: ToastOptions) => string | number
  info: (message: ReactNode, options?: ToastOptions) => string | number
  loading: (message: ReactNode, options?: ToastOptions) => string | number
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: ReactNode
      success: ReactNode | ((data: T) => ReactNode)
      error: ReactNode | ((error: unknown) => ReactNode)
    }
  ) => Promise<T>
  custom: (jsx: ReactNode, options?: ToastOptions) => string | number
  dismiss: (id?: string | number) => void
  message: (message: ReactNode, options?: ToastOptions) => string | number
}

const toast: ToastFunction = Object.assign(
  (message: ReactNode, options?: ToastOptions) => createToast(message, 'default', options),
  {
    success: (message: ReactNode, options?: ToastOptions) => createToast(message, 'success', options),
    error: (message: ReactNode, options?: ToastOptions) => createToast(message, 'error', options),
    warning: (message: ReactNode, options?: ToastOptions) => createToast(message, 'warning', options),
    info: (message: ReactNode, options?: ToastOptions) => createToast(message, 'info', options),
    loading: (message: ReactNode, options?: ToastOptions) => createToast(message, 'loading', options),
    promise: async <T,>(
      promise: Promise<T>,
      options: {
        loading: ReactNode
        success: ReactNode | ((data: T) => ReactNode)
        error: ReactNode | ((error: unknown) => ReactNode)
      }
    ): Promise<T> => {
      const id = createToast(options.loading, 'loading')
      try {
        const result = await promise
        removeToast(id)
        const successMessage = typeof options.success === 'function' ? options.success(result) : options.success
        createToast(successMessage, 'success')
        return result
      } catch (error) {
        removeToast(id)
        const errorMessage = typeof options.error === 'function' ? options.error(error) : options.error
        createToast(errorMessage, 'error')
        throw error
      }
    },
    custom: (jsx: ReactNode, options?: ToastOptions) => createToast(jsx, 'default', options),
    dismiss: (id?: string | number) => {
      if (id !== undefined) {
        dismissToast(id)
      } else {
        dismissAll()
      }
    },
    message: (message: ReactNode, options?: ToastOptions) => createToast(message, 'default', options),
  }
)

/* -------------------------------------------------------------------------------------------------
 * useToasts Hook
 * -----------------------------------------------------------------------------------------------*/

function useToasts() {
  const [state, setState] = useState<ToastData[]>([])

  useEffect(() => {
    subscribers.add(setState)
    // Initialize with current toasts
    setState([...toasts])
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  return state
}

/* -------------------------------------------------------------------------------------------------
 * Toaster Component
 * -----------------------------------------------------------------------------------------------*/

const positionStyles: Record<Position, CSSProperties> = {
  'top-left': { top: 0, left: 0 },
  'top-center': { top: 0, left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-center': { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: 0, right: 0 },
}

const Toaster = forwardRef<ElementRef<typeof Primitive.ol>, ToasterProps>(
  (
    {
      position = 'bottom-right',
      hotkey = ['altKey', 'KeyT'],
      richColors = false,
      expand = false,
      duration = 4000,
      gap = 14,
      visibleToasts = 3,
      closeButton = false,
      toastOptions,
      offset = '32px',
      dir = 'auto',
      theme = 'system',
      icons,
      containerAriaLabel = 'Notifications',
      pauseWhenPageIsHidden = true,
      style,
      ...props
    },
    ref
  ) => {
    const toastList = useToasts()

    // Auto-dismiss toasts
    useEffect(() => {
      const timers: NodeJS.Timeout[] = []

      toastList.forEach((t) => {
        if (t.type !== 'loading' && t.duration !== Infinity) {
          const toastDuration = t.duration ?? toastOptions?.duration ?? duration
          const timer = setTimeout(() => {
            t.onAutoClose?.(t)
            removeToast(t.id)
          }, toastDuration)
          timers.push(timer)
        }
      })

      return () => {
        timers.forEach((timer) => clearTimeout(timer))
      }
    }, [toastList, duration, toastOptions?.duration])

    const getIcon = (type: ToastType): ReactNode => {
      if (icons) {
        switch (type) {
          case 'success': return icons.success
          case 'error': return icons.error
          case 'warning': return icons.warning
          case 'info': return icons.info
          case 'loading': return icons.loading
          default: return null
        }
      }
      return null
    }

    return (
      <Primitive.ol
        ref={ref}
        data-sonner-toaster=""
        data-theme={theme}
        data-rich-colors={richColors ? '' : undefined}
        data-y-position={position.split('-')[0]}
        data-x-position={position.split('-')[1]}
        aria-label={containerAriaLabel}
        tabIndex={-1}
        style={{
          position: 'fixed',
          zIndex: 9999,
          padding: typeof offset === 'number' ? offset : offset,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: position.startsWith('top') ? 'column' : 'column-reverse',
          gap,
          ...positionStyles[position],
          ...style,
        }}
        {...props}
      >
        {toastList.slice(0, visibleToasts).map((t, index) => (
          <Primitive.li
            key={t.id}
            data-sonner-toast=""
            data-type={t.type}
            data-mounted={true}
            data-expanded={expand ? '' : undefined}
            data-front={index === 0 ? '' : undefined}
            aria-live="polite"
            aria-atomic="true"
            role="status"
            tabIndex={0}
            style={{
              pointerEvents: 'auto',
              listStyle: 'none',
              ...toastOptions?.style,
            }}
            className={toastOptions?.className}
          >
            <Primitive.div data-content="">
              {t.icon || getIcon(t.type)}
              <Primitive.div data-title="">{t.title}</Primitive.div>
              {t.description && (
                <Primitive.div data-description="" className={toastOptions?.descriptionClassName}>
                  {t.description}
                </Primitive.div>
              )}
            </Primitive.div>
            {(t.action || t.cancel || closeButton || t.dismissible !== false) && (
              <Primitive.div data-buttons="">
                {t.action && (
                  <Primitive.button
                    data-button=""
                    data-action=""
                    onClick={t.action.onClick}
                    style={toastOptions?.actionButtonStyle}
                  >
                    {t.action.label}
                  </Primitive.button>
                )}
                {t.cancel && (
                  <Primitive.button
                    data-button=""
                    data-cancel=""
                    onClick={() => {
                      t.cancel?.onClick()
                      removeToast(t.id)
                    }}
                    style={toastOptions?.cancelButtonStyle}
                  >
                    {t.cancel.label}
                  </Primitive.button>
                )}
                {(closeButton || t.dismissible !== false) && (
                  <Primitive.button
                    data-close-button=""
                    aria-label="Close toast"
                    onClick={() => removeToast(t.id)}
                  >
                    {icons?.close || '×'}
                  </Primitive.button>
                )}
              </Primitive.div>
            )}
          </Primitive.li>
        ))}
      </Primitive.ol>
    )
  }
)
Toaster.displayName = 'Toaster'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

export { Toaster, toast, useToasts }
export type { ToasterProps, ToastData, ToastType, Position, ToastOptions }
