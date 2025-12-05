/**
 * Timeline
 *
 * Vertical timeline component.
 * Enhances Timeline section from @mdxui/html with richer features.
 */

import * as React from 'react'
import { Timeline as MantineTimeline } from '@mantine/core'
import type { TimelineProps } from '../types'

export function Timeline({
  active,
  bulletSize = 20,
  lineWidth = 2,
  items,
}: TimelineProps) {
  return (
    <MantineTimeline
      active={active}
      bulletSize={bulletSize}
      lineWidth={lineWidth}
    >
      {items.map((item, index) => (
        <MantineTimeline.Item
          key={index}
          title={item.title}
          bullet={item.bullet}
          color={item.color}
        >
          {item.content}
        </MantineTimeline.Item>
      ))}
    </MantineTimeline>
  )
}
