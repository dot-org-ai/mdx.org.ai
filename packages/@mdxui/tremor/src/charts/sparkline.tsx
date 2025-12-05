/**
 * Sparkline Chart
 */

import * as React from 'react'
import { SparkAreaChart } from '@tremor/react'
import type { SparklineProps } from '../types'

export function Sparkline({
  data,
  color = 'blue',
  height = 32,
}: SparklineProps) {
  // Convert number array to data points
  const chartData = data.map((value, index) => ({
    index,
    value,
  }))

  return (
    <SparkAreaChart
      data={chartData}
      categories={['value']}
      index="index"
      colors={[color]}
      className={`h-[${height}px] w-full`}
    />
  )
}
