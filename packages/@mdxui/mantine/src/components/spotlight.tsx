/**
 * Spotlight (Command Palette)
 *
 * Quick search and command palette.
 * GAP: Not available in @mdxui/html.
 */

import * as React from 'react'
import { Spotlight as MantineSpotlight, spotlight } from '@mantine/spotlight'
import type { SpotlightProps } from '../types'

export function SpotlightProvider({
  placeholder = 'Search...',
  query,
  onQueryChange,
  actions,
  shortcut = ['mod', 'K'],
  children,
}: SpotlightProps & { children: React.ReactNode }) {
  return (
    <MantineSpotlight
      actions={actions.map((action) => ({
        id: action.id,
        label: action.label,
        description: action.description,
        leftSection: action.icon,
        group: action.group,
        onClick: action.onTrigger,
      }))}
      nothingFound="No results found"
      searchProps={{
        placeholder,
      }}
      query={query}
      onQueryChange={onQueryChange}
      shortcut={shortcut}
    >
      {children}
    </MantineSpotlight>
  )
}

/**
 * Open the spotlight search programmatically
 */
export function openSpotlight() {
  spotlight.open()
}

/**
 * Close the spotlight search programmatically
 */
export function closeSpotlight() {
  spotlight.close()
}

/**
 * Toggle the spotlight search programmatically
 */
export function toggleSpotlight() {
  spotlight.toggle()
}
