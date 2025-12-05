/**
 * Admin Dashboard Template
 *
 * Full-featured admin dashboard using Mantine components.
 */

import * as React from 'react'
import { MantineProvider, createTheme } from '@mantine/core'
import { AppShellLayout } from '../components/app-shell'
import { NotificationsProvider } from '../components/notifications'
import { SpotlightProvider } from '../components/spotlight'
import type { MantineThemeConfig, SpotlightProps } from '../types'

export interface AdminTemplateProps {
  /** Theme configuration */
  theme?: MantineThemeConfig
  /** Brand/logo element */
  brand?: React.ReactNode
  /** Navigation items */
  navigation: Array<{
    label: string
    href?: string
    icon?: React.ReactNode
    active?: boolean
    children?: Array<{
      label: string
      href?: string
      icon?: React.ReactNode
      active?: boolean
    }>
  }>
  /** Header content (right side) */
  headerContent?: React.ReactNode
  /** Spotlight/command palette config */
  spotlight?: SpotlightProps
  /** Main content */
  children: React.ReactNode
}

export function AdminTemplate({
  theme: themeConfig,
  brand,
  navigation,
  headerContent,
  spotlight,
  children,
}: AdminTemplateProps) {
  const theme = createTheme({
    primaryColor: themeConfig?.primaryColor || 'blue',
    defaultRadius: themeConfig?.radius || 'md',
    fontFamily: themeConfig?.fontFamily,
    headings: {
      fontFamily: themeConfig?.headingFontFamily,
    },
  })

  const content = (
    <MantineProvider theme={theme} defaultColorScheme={themeConfig?.colorScheme || 'auto'}>
      <NotificationsProvider>
        <AppShellLayout
          brand={brand}
          navigation={navigation}
          header={{
            height: 60,
            children: headerContent,
          }}
        >
          {children}
        </AppShellLayout>
      </NotificationsProvider>
    </MantineProvider>
  )

  if (spotlight) {
    return <SpotlightProvider {...spotlight}>{content}</SpotlightProvider>
  }

  return content
}
