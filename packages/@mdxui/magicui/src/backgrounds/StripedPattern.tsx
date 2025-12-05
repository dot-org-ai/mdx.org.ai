'use client'

import * as React from 'react'
import { useId } from 'react'

export interface StripedPatternProps extends React.SVGProps<SVGSVGElement> {
  direction?: 'left' | 'right'
  /** Pattern variant */
  variant?: 'solid' | 'dashed' | 'radial'
}

export function StripedPattern({
  direction = 'left',
  variant = 'solid',
  className = '',
  width = 10,
  height = 10,
  ...props
}: StripedPatternProps) {
  const id = useId()
  const w = Number(width)
  const h = Number(height)

  const variantClass = {
    solid: 'text-primary/15',
    dashed: 'dark:text-primary/40 text-primary/60 stroke-[0.3] [stroke-dasharray:8,4]',
    radial: 'dark:text-primary/40 text-primary/60 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]',
  }

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-10 h-full w-full stroke-[0.5] ${variantClass[variant]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">
          {direction === 'left' ? (
            <>
              <line x1="0" y1={h} x2={w} y2="0" stroke="currentColor" />
              <line x1={-w} y1={h} x2="0" y2="0" stroke="currentColor" />
              <line x1={w} y1={h} x2={w * 2} y2="0" stroke="currentColor" />
            </>
          ) : (
            <>
              <line x1="0" y1="0" x2={w} y2={h} stroke="currentColor" />
              <line x1={-w} y1="0" x2="0" y2={h} stroke="currentColor" />
              <line x1={w} y1="0" x2={w * 2} y2={h} stroke="currentColor" />
            </>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
