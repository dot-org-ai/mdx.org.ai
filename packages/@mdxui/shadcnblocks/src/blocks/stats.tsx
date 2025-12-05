/**
 * Stats Blocks
 */

import * as React from 'react'
import type { StatsBlockProps } from '../types'

export function StatsGrid({ stats }: StatsBlockProps) {
  return (
    <section aria-label="Stats" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold">{stat.value}</div>
              <div className="mt-2 text-muted-foreground">{stat.label}</div>
              {stat.trend && (
                <div
                  className={`mt-2 text-sm ${
                    stat.trend.type === 'up'
                      ? 'text-green-600'
                      : stat.trend.type === 'down'
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {stat.trend.value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function StatsCards({ stats }: StatsBlockProps) {
  return (
    <section aria-label="Stats" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="rounded-lg border bg-card p-6 text-center">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const Stats = { Grid: StatsGrid, Cards: StatsCards }
