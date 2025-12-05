/**
 * Notifications System
 *
 * Toast notifications.
 * GAP: Only basic feedback in @mdxui/html.
 */

import * as React from 'react'
import { Notifications as MantineNotifications, notifications } from '@mantine/notifications'
import type { NotificationProps } from '../types'

/**
 * Notifications provider - wrap your app with this
 */
export function NotificationsProvider({
  position = 'top-right',
  autoClose = 5000,
  children,
}: {
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center'
  autoClose?: number
  children: React.ReactNode
}) {
  return (
    <>
      <MantineNotifications position={position} autoClose={autoClose} />
      {children}
    </>
  )
}

/**
 * Show a notification
 */
export function showNotification({
  id,
  title,
  message,
  color,
  icon,
  loading,
  autoClose,
  onClose,
}: NotificationProps) {
  notifications.show({
    id,
    title,
    message,
    color,
    icon,
    loading,
    autoClose,
    onClose,
  })
}

/**
 * Update an existing notification
 */
export function updateNotification({
  id,
  ...props
}: NotificationProps & { id: string }) {
  notifications.update({
    id,
    ...props,
  })
}

/**
 * Hide a notification
 */
export function hideNotification(id: string) {
  notifications.hide(id)
}

/**
 * Show success notification
 */
export function showSuccess(message: string, title?: string) {
  showNotification({
    title,
    message,
    color: 'green',
  })
}

/**
 * Show error notification
 */
export function showError(message: string, title?: string) {
  showNotification({
    title: title || 'Error',
    message,
    color: 'red',
  })
}

/**
 * Show loading notification, returns id to update later
 */
export function showLoading(message: string, title?: string) {
  const id = `loading-${Date.now()}`
  showNotification({
    id,
    title,
    message,
    loading: true,
    autoClose: false,
  })
  return id
}
