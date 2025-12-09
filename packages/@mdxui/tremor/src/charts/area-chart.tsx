/**
 * Area Chart
 *
 * SVG-based area chart with Hono JSX compatibility.
 */

import {
  forwardRef,
  useMemo,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import type { AreaChartProps } from '../types'

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
]

type AreaChartElement = HTMLDivElement

const AreaChart = forwardRef<AreaChartElement, AreaChartProps & ComponentPropsWithoutRef<'div'>>(
  ({
    data,
    index,
    categories,
    colors = DEFAULT_COLORS,
    showLegend = true,
    showGrid = true,
    showTooltip = true,
    stack = false,
    gradient = true,
    height = 300,
    className = '',
    ...props
  }, ref) => {
    const chartHeight = typeof height === 'number' ? height : 300
    const chartWidth = 600
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }

    const chartData = useMemo(() => {
      if (!data || data.length === 0) return null

      const innerHeight = chartHeight - padding.top - padding.bottom

      // Calculate min/max values
      let minValue = 0
      let maxValue = 0

      if (stack) {
        // For stacked areas, max is the sum of all categories at each point
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

      // Calculate scales
      const xScale = (i: number) =>
        padding.left + (i / (data.length - 1 || 1)) * (chartWidth - padding.left - padding.right)
      const yScale = (value: number) =>
        chartHeight - padding.bottom - ((value - minValue) / (maxValue - minValue)) * innerHeight

      // Generate areas for each category
      const areas = categories.map((category, catIndex) => {
        // For stacked areas, we need to track baseline
        const points: Array<{ x: number; y: number; y0: number }> = []

        data.forEach((item, i) => {
          const value = item[category]
          if (typeof value !== 'number') return

          let y0 = chartHeight - padding.bottom
          let yValue = yScale(value)

          if (stack && catIndex > 0) {
            // Calculate baseline from previous categories
            let baseSum = 0
            for (let j = 0; j < catIndex; j++) {
              const prevValue = item[categories[j]]
              if (typeof prevValue === 'number') {
                baseSum += prevValue
              }
            }
            y0 = yScale(baseSum)
            yValue = yScale(baseSum + value)
          }

          points.push({
            x: xScale(i),
            y: yValue,
            y0,
          })
        })

        // Build area path (top line + bottom line reversed)
        let areaPath = ''
        if (points.length > 0) {
          // Top line
          areaPath = `M ${points[0].x} ${points[0].y}`
          for (let i = 1; i < points.length; i++) {
            areaPath += ` L ${points[i].x} ${points[i].y}`
          }
          // Bottom line (reversed)
          for (let i = points.length - 1; i >= 0; i--) {
            areaPath += ` L ${points[i].x} ${points[i].y0}`
          }
          areaPath += ' Z'
        }

        // Build line path
        let linePath = ''
        if (points.length > 0) {
          linePath = `M ${points[0].x} ${points[0].y}`
          for (let i = 1; i < points.length; i++) {
            linePath += ` L ${points[i].x} ${points[i].y}`
          }
        }

        return {
          category,
          areaPath,
          linePath,
          color: colors[catIndex % colors.length],
          points,
        }
      })

      // Reverse order for stacked rendering (so first category is on bottom)
      if (stack) {
        areas.reverse()
      }

      // Generate grid lines
      const gridLines: Array<{ y: number; value: number }> = []
      const numLines = 5
      for (let i = 0; i <= numLines; i++) {
        const value = (maxValue / numLines) * i
        const y = yScale(value)
        gridLines.push({ y, value: Math.round(value) })
      }

      // Generate x-axis labels
      const xLabels = data.map((item, i) => ({
        x: xScale(i),
        label: String(item[index]),
      }))

      return { areas, gridLines, xLabels, maxValue }
    }, [data, index, categories, colors, stack, chartWidth, chartHeight])

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
          {/* Gradient definitions */}
          {gradient && (
            <defs>
              {chartData.areas.map((area) => (
                <linearGradient
                  key={`gradient-${area.category}`}
                  id={`gradient-${area.category}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={area.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={area.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
          )}

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
                {line.value}
              </text>
            </g>
          ))}

          {/* Areas */}
          {chartData.areas.map((area) => (
            <path
              key={`area-${area.category}`}
              d={area.areaPath}
              fill={gradient ? `url(#gradient-${area.category})` : area.color}
              fillOpacity={gradient ? 1 : 0.3}
            />
          ))}

          {/* Lines */}
          {chartData.areas.map((area) => (
            <path
              key={`line-${area.category}`}
              d={area.linePath}
              fill="none"
              stroke={area.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Data points */}
          {showTooltip && chartData.areas.map((area) =>
            area.points.map((point, i) => (
              <circle
                key={`${area.category}-${i}`}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={area.color}
                className="opacity-0 hover:opacity-100 transition-opacity"
              />
            ))
          )}

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
AreaChart.displayName = 'AreaChart'

export { AreaChart }
