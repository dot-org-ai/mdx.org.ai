/**
 * Bar Chart
 *
 * SVG-based bar chart with Hono JSX compatibility.
 */

import {
  forwardRef,
  useMemo,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import type { BarChartProps } from '../types'

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
]

type BarChartElement = HTMLDivElement

const BarChart = forwardRef<BarChartElement, BarChartProps & ComponentPropsWithoutRef<'div'>>(
  ({
    data,
    index,
    categories,
    colors = DEFAULT_COLORS,
    showLegend = true,
    showGrid = true,
    showTooltip = true,
    stack = false,
    layout = 'vertical',
    relative = false,
    height = 300,
    className = '',
    ...props
  }, ref) => {
    const chartHeight = typeof height === 'number' ? height : 300
    const chartWidth = 600
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }

    const chartData = useMemo(() => {
      if (!data || data.length === 0) return null

      // Calculate values based on stack/relative mode
      let maxValue = 0

      if (stack || relative) {
        for (const item of data) {
          let sum = 0
          for (const category of categories) {
            const value = item[category]
            if (typeof value === 'number') {
              sum += value
            }
          }
          maxValue = Math.max(maxValue, sum)
        }
        if (relative) maxValue = 100
      } else {
        for (const item of data) {
          for (const category of categories) {
            const value = item[category]
            if (typeof value === 'number') {
              maxValue = Math.max(maxValue, value)
            }
          }
        }
      }

      maxValue = maxValue * 1.1 || 1 // Add 10% padding

      // Calculate bar dimensions
      const innerWidth = chartWidth - padding.left - padding.right
      const innerHeight = chartHeight - padding.top - padding.bottom
      const barGroupWidth = innerWidth / data.length
      const barGap = stack ? 0 : barGroupWidth * 0.1
      const barWidth = stack
        ? barGroupWidth * 0.8
        : (barGroupWidth * 0.8 - barGap * (categories.length - 1)) / categories.length

      // Generate bars
      const bars: Array<{
        x: number
        y: number
        width: number
        height: number
        color: string
        category: string
        value: number
        label: string
      }> = []

      data.forEach((item, dataIndex) => {
        let stackY = chartHeight - padding.bottom

        if (stack || relative) {
          // Calculate total for relative mode
          let total = 0
          if (relative) {
            for (const category of categories) {
              const value = item[category]
              if (typeof value === 'number') {
                total += value
              }
            }
          }

          categories.forEach((category, catIndex) => {
            const rawValue = item[category]
            if (typeof rawValue !== 'number') return

            const value = relative && total > 0 ? (rawValue / total) * 100 : rawValue
            const barHeight = (value / maxValue) * innerHeight

            bars.push({
              x: padding.left + dataIndex * barGroupWidth + barGroupWidth * 0.1,
              y: stackY - barHeight,
              width: barWidth,
              height: barHeight,
              color: colors[catIndex % colors.length],
              category,
              value: rawValue,
              label: String(item[index]),
            })

            stackY -= barHeight
          })
        } else {
          // Grouped bars
          categories.forEach((category, catIndex) => {
            const value = item[category]
            if (typeof value !== 'number') return

            const barHeight = (value / maxValue) * innerHeight
            const x = padding.left + dataIndex * barGroupWidth + barGroupWidth * 0.1 + catIndex * (barWidth + barGap)

            bars.push({
              x,
              y: chartHeight - padding.bottom - barHeight,
              width: barWidth,
              height: barHeight,
              color: colors[catIndex % colors.length],
              category,
              value,
              label: String(item[index]),
            })
          })
        }
      })

      // Generate grid lines
      const gridLines: Array<{ y: number; value: number }> = []
      const numLines = 5
      for (let i = 0; i <= numLines; i++) {
        const value = (maxValue / numLines) * i
        const y = chartHeight - padding.bottom - (value / maxValue) * innerHeight
        gridLines.push({ y, value: Math.round(value) })
      }

      // Generate x-axis labels
      const xLabels = data.map((item, i) => ({
        x: padding.left + i * barGroupWidth + barGroupWidth / 2,
        label: String(item[index]),
      }))

      return { bars, gridLines, xLabels, maxValue }
    }, [data, index, categories, colors, stack, relative, chartWidth, chartHeight])

    if (!chartData) {
      return (
        <Primitive.div
          ref={ref}
          className={`flex items-center justify-center text-muted-foreground ${className}`}
          style={{ height: chartHeight }}
          {...props}
        >
          No data available
        </Primitive.div>
      )
    }

    return (
      <Primitive.div ref={ref} className={className} {...props}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
          style={{ height: chartHeight }}
        >
          {/* Grid lines */}
          {showGrid && chartData.gridLines.map((line, i) => (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={chartWidth - padding.right}
                y2={line.y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={line.y}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize={12}
                fill="currentColor"
                fillOpacity={0.6}
              >
                {relative ? `${line.value}%` : line.value}
              </text>
            </g>
          ))}

          {/* Bars */}
          {chartData.bars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
              rx={2}
              className="transition-opacity hover:opacity-80"
            />
          ))}

          {/* X-axis labels */}
          {chartData.xLabels.map((label, i) => (
            <text
              key={`x-label-${i}`}
              x={label.x}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
              fillOpacity={0.6}
            >
              {label.label}
            </text>
          ))}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {categories.map((category, i) => (
              <div key={category} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-sm text-muted-foreground">{category}</span>
              </div>
            ))}
          </div>
        )}
      </Primitive.div>
    )
  }
)
BarChart.displayName = 'BarChart'

export { BarChart }
