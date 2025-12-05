/**
 * Line Chart
 *
 * Wrapper around Tremor LineChart with MDXUI integration.
 */

import * as React from 'react'
import { LineChart as TremorLineChart } from '@tremor/react'
import type { LineChartProps } from '../types'

export function LineChart({
  data,
  index,
  categories,
  colors,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  curveType = 'linear',
  connectNulls = false,
  height = 300,
}: LineChartProps) {
  return (
    <TremorLineChart
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      showLegend={showLegend}
      showGridLines={showGrid}
      showTooltip={showTooltip}
      curveType={curveType}
      connectNulls={connectNulls}
      className={typeof height === 'number' ? `h-[${height}px]` : height}
    />
  )
}
