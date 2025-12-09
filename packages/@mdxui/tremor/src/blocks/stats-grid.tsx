/**
 * Stats Grid
 *
 * Grid of statistics with optional charts.
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { Card } from '../ui/card'
import { Text, Metric } from '../ui/text'
import { Sparkline } from '../charts/sparkline'

export interface StatWithChartProps {
  title: string
  value: string | number
  change?: {
    value: string
    positive: boolean
  }
  chart?: {
    data: number[]
    color?: string
  }
}

type StatWithChartElement = HTMLDivElement

const StatWithChart = forwardRef<StatWithChartElement, StatWithChartProps & ComponentPropsWithoutRef<'div'>>(
  ({
    title,
    value,
    change,
    chart,
    className = '',
    ...props
  }, ref) => {
    return (
      <Card ref={ref} className={className} {...props}>
        <Text>{title}</Text>
        <Metric className="mt-2">{value}</Metric>
        {change && (
          <Text className={`mt-2 text-sm ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
            {change.positive ? '↑' : '↓'} {change.value}
          </Text>
        )}
        {chart && chart.data.length > 0 && (
          <Sparkline
            data={chart.data}
            color={chart.color || '#3b82f6'}
            height={48}
            variant="area"
            className="mt-4"
          />
        )}
      </Card>
    )
  }
)
StatWithChart.displayName = 'StatWithChart'

interface StatsGridProps extends ComponentPropsWithoutRef<'div'> {
  stats: StatWithChartProps[]
  columns?: 2 | 3 | 4
}

const StatsGrid = forwardRef<HTMLDivElement, StatsGridProps>(
  ({ stats, columns = 4, className = '', ...props }, ref) => {
    const gridCols = {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-2 lg:grid-cols-4',
    }

    return (
      <Primitive.div
        ref={ref}
        className={`grid gap-4 ${gridCols[columns]} ${className}`.trim()}
        {...props}
      >
        {stats.map((stat, i) => (
          <StatWithChart key={i} {...stat} />
        ))}
      </Primitive.div>
    )
  }
)
StatsGrid.displayName = 'StatsGrid'

export { StatWithChart, StatsGrid }
export type { StatsGridProps }
