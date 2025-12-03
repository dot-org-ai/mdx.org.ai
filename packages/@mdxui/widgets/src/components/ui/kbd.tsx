'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Key combination to display */
  keys?: string[]
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, keys, children, ...props }, ref) => {
    const renderKeys = keys || (typeof children === 'string' ? [children] : [])

    return (
      <span className="inline-flex items-center gap-1">
        {renderKeys.map((key, index) => (
          <kbd
            key={index}
            ref={index === 0 ? ref : undefined}
            className={cn(
              'pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground',
              className
            )}
            {...props}
          >
            {key}
          </kbd>
        ))}
      </span>
    )
  }
)

Kbd.displayName = 'Kbd'

export { Kbd }
