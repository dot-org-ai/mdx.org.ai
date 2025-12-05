/**
 * Area Chart
 */

import * as React from 'react'
import { AreaChart as TremorAreaChart } from '@tremor/react'
import type { AreaChartProps } from '../types'

export function AreaChart({
  data,
  index,
  categories,
  colors,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  stack = false,
  height = 300,
}: AreaChartProps) {
  return (
    <TremorAreaChart
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      showLegend={showLegend}
      showGridLines={showGrid}
      showTooltip={showTooltip}
      stack={stack}
      className={typeof height === 'number' ? `h-[${height}px]` : height}
    />
  )
}
