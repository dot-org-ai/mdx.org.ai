/**
 * Sparkline Chart
 *
 * SVG-based sparkline with Hono JSX compatibility.
 */

import {
  forwardRef,
  useMemo,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import type { SparklineProps } from '../types'

type SparklineElement = HTMLDivElement

interface SparklineComponentProps extends SparklineProps, ComponentPropsWithoutRef<'div'> {
  /** Sparkline variant */
  variant?: 'line' | 'area' | 'bar'
  /** Show data points */
  showPoints?: boolean
}

const Sparkline = forwardRef<SparklineElement, SparklineComponentProps>(
  ({
    data,
    color = '#3b82f6',
    height = 32,
    variant = 'area',
    showPoints = false,
    className = '',
    ...props
  }, ref) => {
    const width = 120 // Fixed width, will scale

    const chartData = useMemo(() => {
      if (!data || data.length === 0) return null

      const minValue = Math.min(...data)
      const maxValue = Math.max(...data)
      const range = maxValue - minValue || 1

      const padding = 2
      const innerHeight = height - padding * 2
      const innerWidth = width - padding * 2

      const xScale = (i: number) =>
        padding + (i / (data.length - 1 || 1)) * innerWidth
      const yScale = (value: number) =>
        height - padding - ((value - minValue) / range) * innerHeight

      // Build points
      const points = data.map((value, i) => ({
        x: xScale(i),
        y: yScale(value),
        value,
      }))

      // Build line path
      let linePath = ''
      if (points.length > 0) {
        linePath = `M ${points[0].x} ${points[0].y}`
        for (let i = 1; i < points.length; i++) {
          linePath += ` L ${points[i].x} ${points[i].y}`
        }
      }

      // Build area path
      let areaPath = ''
      if (points.length > 0) {
        areaPath = linePath
        areaPath += ` L ${points[points.length - 1].x} ${height - padding}`
        areaPath += ` L ${points[0].x} ${height - padding}`
        areaPath += ' Z'
      }

      // Build bars
      const barWidth = innerWidth / data.length - 1
      const bars = data.map((value, i) => ({
        x: padding + (i / data.length) * innerWidth,
        y: yScale(value),
        width: Math.max(1, barWidth),
        height: height - padding - yScale(value),
        value,
      }))

      return { points, linePath, areaPath, bars }
    }, [data, height, width])

    if (!chartData) {
      return (
        <Primitive.div
          ref={ref}
          className={`flex items-center justify-center text-muted-foreground ${className}`}
          style={{ height }}
          {...props}
        >
          -
        </Primitive.div>
      )
    }

    return (
      <Primitive.div ref={ref} className={className} {...props}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ height }}
          preserveAspectRatio="none"
        >
          {variant === 'bar' ? (
            // Bar variant
            chartData.bars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={color}
                rx={1}
              />
            ))
          ) : (
            <>
              {/* Area fill */}
              {variant === 'area' && (
                <path
                  d={chartData.areaPath}
                  fill={color}
                  fillOpacity={0.2}
                />
              )}

              {/* Line */}
              <path
                d={chartData.linePath}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {showPoints && chartData.points.map((point, i) => (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={2}
                  fill={color}
                />
              ))}
            </>
          )}
        </svg>
      </Primitive.div>
    )
  }
)
Sparkline.displayName = 'Sparkline'

export { Sparkline }
