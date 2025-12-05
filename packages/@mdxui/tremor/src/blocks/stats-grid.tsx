/**
 * Stats Grid
 *
 * Grid of statistics with optional charts.
 */

import * as React from 'react'
import { Card, Metric, Text, AreaChart } from '@tremor/react'

export interface StatWithChartProps {
  title: string
  value: string | number
  change?: {
    value: string
    positive: boolean
  }
  chart?: {
    data: Array<{ date: string; value: number }>
    color?: string
  }
}

export function StatWithChart({
  title,
  value,
  change,
  chart,
}: StatWithChartProps) {
  return (
    <Card>
      <Text>{title}</Text>
      <Metric className="mt-2">{value}</Metric>
      {change && (
        <Text className={`mt-2 text-sm ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
          {change.positive ? '↑' : '↓'} {change.value}
        </Text>
      )}
      {chart && (
        <AreaChart
          className="mt-4 h-16"
          data={chart.data}
          index="date"
          categories={['value']}
          colors={[chart.color || 'blue']}
          showLegend={false}
          showYAxis={false}
          showXAxis={false}
          showGridLines={false}
          showTooltip={false}
        />
      )}
    </Card>
  )
}

export function StatsGrid({
  stats,
  columns = 4,
}: {
  stats: StatWithChartProps[]
  columns?: 2 | 3 | 4
}) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {stats.map((stat, i) => (
        <StatWithChart key={i} {...stat} />
      ))}
    </div>
  )
}
