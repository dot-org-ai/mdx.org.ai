/**
 * Line Chart
 *
 * SVG-based line chart with Hono JSX compatibility.
 * Note: For complex charts, consider using a client-side charting library
 * that supports both React and Hono (e.g., Chart.js with vanilla JS).
 */

import {
  forwardRef,
  useMemo,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import type { LineChartProps } from '../types'

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
]

type LineChartElement = HTMLDivElement

const LineChart = forwardRef<LineChartElement, LineChartProps & ComponentPropsWithoutRef<'div'>>(
  ({
    data,
    index,
    categories,
    colors = DEFAULT_COLORS,
    showLegend = true,
    showGrid = true,
    showTooltip = true,
    curveType = 'linear',
    connectNulls = false,
    height = 300,
    className = '',
    ...props
  }, ref) => {
    const chartHeight = typeof height === 'number' ? height : 300
    const chartWidth = 600 // Will scale with container
    const padding = { top: 20, right: 20, bottom: 40, left: 50 }

    const chartData = useMemo(() => {
      if (!data || data.length === 0) return null

      // Calculate min/max values
      let minValue = Infinity
      let maxValue = -Infinity

      for (const item of data) {
        for (const category of categories) {
          const value = item[category]
          if (typeof value === 'number') {
            minValue = Math.min(minValue, value)
            maxValue = Math.max(maxValue, value)
          }
        }
      }

      // Add padding to range
      const range = maxValue - minValue || 1
      minValue = Math.max(0, minValue - range * 0.1)
      maxValue = maxValue + range * 0.1

      // Calculate scales
      const xScale = (i: number) =>
        padding.left + (i / (data.length - 1 || 1)) * (chartWidth - padding.left - padding.right)
      const yScale = (value: number) =>
        chartHeight - padding.bottom - ((value - minValue) / (maxValue - minValue)) * (chartHeight - padding.top - padding.bottom)

      // Generate paths for each category
      const paths = categories.map((category, catIndex) => {
        const points: Array<{ x: number; y: number } | null> = data.map((item, i) => {
          const value = item[category]
          if (typeof value !== 'number') return null
          return { x: xScale(i), y: yScale(value) }
        })

        // Build path string
        let pathD = ''
        let started = false

        for (let i = 0; i < points.length; i++) {
          const point = points[i]
          if (point === null) {
            if (!connectNulls) {
              started = false
            }
            continue
          }

          if (!started) {
            pathD += `M ${point.x} ${point.y}`
            started = true
          } else {
            pathD += ` L ${point.x} ${point.y}`
          }
        }

        return {
          category,
          path: pathD,
          color: colors[catIndex % colors.length],
          points: points.filter((p): p is { x: number; y: number } => p !== null),
        }
      })

      // Generate grid lines
      const gridLines: number[] = []
      const numLines = 5
      for (let i = 0; i <= numLines; i++) {
        const value = minValue + (maxValue - minValue) * (i / numLines)
        gridLines.push(yScale(value))
      }

      // Generate x-axis labels
      const xLabels = data.map((item, i) => ({
        x: xScale(i),
        label: String(item[index]),
      }))

      // Generate y-axis labels
      const yLabels = gridLines.map((y, i) => ({
        y,
        label: Math.round(minValue + (maxValue - minValue) * (i / numLines)),
      }))

      return { paths, gridLines, xLabels, yLabels, minValue, maxValue }
    }, [data, index, categories, colors, connectNulls, chartWidth, chartHeight])

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
          {showGrid && chartData.gridLines.map((y, i) => (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Y-axis labels */}
          {chartData.yLabels.map((label, i) => (
            <text
              key={`y-label-${i}`}
              x={padding.left - 8}
              y={label.y}
              textAnchor="end"
              alignmentBaseline="middle"
              fontSize={12}
              fill="currentColor"
              fillOpacity={0.6}
            >
              {label.label}
            </text>
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

          {/* Lines */}
          {chartData.paths.map((line) => (
            <path
              key={line.category}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Data points */}
          {showTooltip && chartData.paths.map((line) =>
            line.points.map((point, i) => (
              <circle
                key={`${line.category}-${i}`}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={line.color}
                className="opacity-0 hover:opacity-100 transition-opacity"
              />
            ))
          )}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {chartData.paths.map((line) => (
              <div key={line.category} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                <span className="text-sm text-muted-foreground">{line.category}</span>
              </div>
            ))}
          </div>
        )}
      </Primitive.div>
    )
  }
)
LineChart.displayName = 'LineChart'

export { LineChart }
