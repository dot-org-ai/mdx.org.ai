/**
 * KPI Card
 *
 * Key performance indicator display card.
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { Card } from '../ui/card'
import { Text, Metric } from '../ui/text'
import { Flex } from '../ui/flex'
import { BadgeDelta } from '../ui/badge'
import { Sparkline } from '../charts/sparkline'
import type { KPICardProps } from '../types'

type KPICardElement = HTMLDivElement

const KPICard = forwardRef<KPICardElement, KPICardProps & ComponentPropsWithoutRef<'div'>>(
  ({
    title,
    value,
    icon,
    trend,
    comparison,
    sparkline,
    className = '',
    ...props
  }, ref) => {
    const deltaType = trend?.direction === 'up'
      ? 'increase'
      : trend?.direction === 'down'
      ? 'decrease'
      : 'unchanged'

    return (
      <Card ref={ref} className={className} {...props}>
        <Flex justifyContent="between" alignItems="start">
          <div className="flex-1">
            <Text>{title}</Text>
            <Metric className="mt-2">{value}</Metric>
            {comparison && (
              <Text className="mt-2 text-sm">
                vs {comparison.value} {comparison.label}
              </Text>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            {sparkline && sparkline.length > 0 && (
              <Sparkline
                data={sparkline}
                color={
                  trend?.direction === 'up'
                    ? '#10b981'
                    : trend?.direction === 'down'
                    ? '#ef4444'
                    : '#6b7280'
                }
                height={24}
                className="w-20"
              />
            )}
          </div>
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
)
KPICard.displayName = 'KPICard'

/**
 * KPI Card Grid
 *
 * Grid of KPI cards for dashboard overview.
 */
interface KPICardGridProps extends ComponentPropsWithoutRef<'div'> {
  cards: KPICardProps[]
  columns?: 2 | 3 | 4
}

const KPICardGrid = forwardRef<HTMLDivElement, KPICardGridProps>(
  ({ cards, columns = 4, className = '', ...props }, ref) => {
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
        {cards.map((card, i) => (
          <KPICard key={i} {...card} />
        ))}
      </Primitive.div>
    )
  }
)
KPICardGrid.displayName = 'KPICardGrid'

export { KPICard, KPICardGrid }
export type { KPICardGridProps }
