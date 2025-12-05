/**
 * Donut Chart
 */

import * as React from 'react'
import { DonutChart as TremorDonutChart } from '@tremor/react'
import type { DonutChartProps } from '../types'

export function DonutChart({
  data,
  category,
  index,
  colors,
  label,
  showLegend = true,
  variant = 'donut',
}: DonutChartProps) {
  return (
    <TremorDonutChart
      data={data}
      category={category}
      index={index}
      colors={colors}
      label={label}
      showLabel={!!label}
      showTooltip
      variant={variant}
    />
  )
}
