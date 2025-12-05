/**
 * Bar Chart
 */

import * as React from 'react'
import { BarChart as TremorBarChart } from '@tremor/react'
import type { BarChartProps } from '../types'

export function BarChart({
  data,
  index,
  categories,
  colors,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  stack = false,
  layout = 'vertical',
  relative = false,
  height = 300,
}: BarChartProps) {
  return (
    <TremorBarChart
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      showLegend={showLegend}
      showGridLines={showGrid}
      showTooltip={showTooltip}
      stack={stack}
      layout={layout}
      relative={relative}
      className={typeof height === 'number' ? `h-[${height}px]` : height}
    />
  )
}
