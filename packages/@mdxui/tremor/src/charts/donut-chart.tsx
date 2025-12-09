/**
 * Donut Chart
 *
 * SVG-based donut/pie chart with Hono JSX compatibility.
 */

import {
  forwardRef,
  useMemo,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import type { DonutChartProps } from '../types'

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
]

type DonutChartElement = HTMLDivElement

interface DonutChartComponentProps extends DonutChartProps, Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Chart size */
  size?: number
}

const DonutChart = forwardRef<DonutChartElement, DonutChartComponentProps>(
  ({
    data,
    category,
    index,
    colors = DEFAULT_COLORS,
    label,
    showLegend = true,
    variant = 'donut',
    size = 200,
    className = '',
    ...props
  }, ref) => {
    const chartData = useMemo(() => {
      if (!data || data.length === 0) return null

      // Calculate total
      const total = data.reduce((sum, item) => sum + item.value, 0)
      if (total === 0) return null

      // Calculate angles for each segment
      const centerX = size / 2
      const centerY = size / 2
      const outerRadius = (size / 2) - 10
      const innerRadius = variant === 'pie' ? 0 : outerRadius * 0.6

      let currentAngle = -Math.PI / 2 // Start from top

      const segments = data.map((item, i) => {
        const angle = (item.value / total) * 2 * Math.PI
        const startAngle = currentAngle
        const endAngle = currentAngle + angle

        // Calculate arc path
        const x1 = centerX + outerRadius * Math.cos(startAngle)
        const y1 = centerY + outerRadius * Math.sin(startAngle)
        const x2 = centerX + outerRadius * Math.cos(endAngle)
        const y2 = centerY + outerRadius * Math.sin(endAngle)

        const x3 = centerX + innerRadius * Math.cos(endAngle)
        const y3 = centerY + innerRadius * Math.sin(endAngle)
        const x4 = centerX + innerRadius * Math.cos(startAngle)
        const y4 = centerY + innerRadius * Math.sin(startAngle)

        const largeArcFlag = angle > Math.PI ? 1 : 0

        // Build path
        let path: string
        if (innerRadius === 0) {
          // Pie chart (no inner hole)
          path = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z',
          ].join(' ')
        } else {
          // Donut chart
          path = [
            `M ${x1} ${y1}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `L ${x3} ${y3}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
            'Z',
          ].join(' ')
        }

        currentAngle = endAngle

        return {
          name: item.name,
          value: item.value,
          percentage: ((item.value / total) * 100).toFixed(1),
          path,
          color: colors[i % colors.length],
        }
      })

      return { segments, total, centerX, centerY, innerRadius }
    }, [data, colors, variant, size])

    if (!chartData) {
      return (
        <Primitive.div
          ref={ref}
          className={`flex items-center justify-center text-muted-foreground ${className}`}
          style={{ width: size, height: size }}
          {...props}
        >
          No data available
        </Primitive.div>
      )
    }

    return (
      <Primitive.div ref={ref} className={`flex flex-col items-center ${className}`} {...props}>
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full"
          >
            {chartData.segments.map((segment, i) => (
              <path
                key={i}
                d={segment.path}
                fill={segment.color}
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </svg>

          {/* Center label for donut */}
          {variant === 'donut' && label && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                top: chartData.centerY - chartData.innerRadius * 0.5,
                left: chartData.centerX - chartData.innerRadius * 0.8,
                width: chartData.innerRadius * 1.6,
                height: chartData.innerRadius,
              }}
            >
              <span className="text-lg font-semibold text-center">{label}</span>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {chartData.segments.map((segment, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {segment.name} ({segment.percentage}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </Primitive.div>
    )
  }
)
DonutChart.displayName = 'DonutChart'

export { DonutChart }
