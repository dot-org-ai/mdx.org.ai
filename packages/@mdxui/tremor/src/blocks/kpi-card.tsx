/**
 * KPI Card
 *
 * Key performance indicator display card.
 */

import * as React from 'react'
import { Card, Metric, Text, Flex, BadgeDelta } from '@tremor/react'
import type { KPICardProps } from '../types'

export function KPICard({
  title,
  value,
  icon,
  trend,
  comparison,
  sparkline,
}: KPICardProps) {
  const deltaType = trend?.direction === 'up'
    ? 'increase'
    : trend?.direction === 'down'
    ? 'decrease'
    : 'unchanged'

  return (
    <Card>
      <Flex justifyContent="between" alignItems="center">
        <div>
          <Text>{title}</Text>
          <Metric>{value}</Metric>
          {comparison && (
            <Text className="mt-2 text-sm text-muted-foreground">
              vs {comparison.value} {comparison.label}
            </Text>
          )}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </Flex>
      {trend && (
        <Flex className="mt-4" justifyContent="start" alignItems="center">
          <BadgeDelta deltaType={deltaType}>
            {trend.value}
          </BadgeDelta>
          {trend.label && (
            <Text className="ml-2 text-sm">{trend.label}</Text>
          )}
        </Flex>
      )}
    </Card>
  )
}

/**
 * KPI Card Grid
 *
 * Grid of KPI cards for dashboard overview.
 */
export function KPICardGrid({
  cards,
  columns = 4,
}: {
  cards: KPICardProps[]
  columns?: 2 | 3 | 4
}) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {cards.map((card, i) => (
        <KPICard key={i} {...card} />
      ))}
    </div>
  )
}
