/**
 * App Shell
 *
 * Application layout with header, navbar, aside, and footer.
 * Maps to AppLayout from @mdxui/html.
 */

import * as React from 'react'
import { AppShell as MantineAppShell, Burger, Group, NavLink } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import type { AppShellProps } from '../types'

export interface AppShellNavItem {
  label: string
  href?: string
  icon?: React.ReactNode
  active?: boolean
  children?: AppShellNavItem[]
}

export interface MdxuiAppShellProps extends Omit<AppShellProps, 'navbar'> {
  /** Navigation items for sidebar */
  navigation?: AppShellNavItem[]
  /** Brand/logo */
  brand?: React.ReactNode
  /** Navbar width */
  navbarWidth?: number
  /** Navbar breakpoint for mobile collapse */
  navbarBreakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function AppShellLayout({
  header,
  navigation,
  brand,
  navbarWidth = 250,
  navbarBreakpoint = 'sm',
  aside,
  footer,
  padding = 'md',
  children,
}: MdxuiAppShellProps) {
  const [opened, { toggle }] = useDisclosure()

  return (
    <MantineAppShell
      header={{ height: header?.height || 60 }}
      navbar={
        navigation
          ? {
              width: navbarWidth,
              breakpoint: navbarBreakpoint,
              collapsed: { mobile: !opened },
            }
          : undefined
      }
      aside={
        aside
          ? {
              width: aside.width || 300,
              breakpoint: aside.breakpoint || 'sm',
              collapsed: aside.collapsed,
            }
          : undefined
      }
      footer={footer ? { height: footer.height || 60 } : undefined}
      padding={padding}
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md">
          {navigation && (
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom={navbarBreakpoint}
              size="sm"
            />
          )}
          {brand}
          {header?.children}
        </Group>
      </MantineAppShell.Header>

      {navigation && (
        <MantineAppShell.Navbar p="md">
          {navigation.map((item, i) => (
            <NavLink
              key={i}
              href={item.href}
              label={item.label}
              leftSection={item.icon}
              active={item.active}
              childrenOffset={28}
            >
              {item.children?.map((child, j) => (
                <NavLink
                  key={j}
                  href={child.href}
                  label={child.label}
                  leftSection={child.icon}
                  active={child.active}
                />
              ))}
            </NavLink>
          ))}
        </MantineAppShell.Navbar>
      )}

      <MantineAppShell.Main>{children}</MantineAppShell.Main>

      {aside && <MantineAppShell.Aside p="md">{aside.children}</MantineAppShell.Aside>}

      {footer && <MantineAppShell.Footer p="md">{footer.children}</MantineAppShell.Footer>}
    </MantineAppShell>
  )
}
