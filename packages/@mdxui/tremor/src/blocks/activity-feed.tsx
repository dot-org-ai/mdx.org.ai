/**
 * Activity Feed (GAP: Not in @mdxui/html)
 *
 * Timeline of recent activities/events.
 */

import * as React from 'react'
import { Card, Text } from '@tremor/react'

export interface ActivityItem {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  description?: string
  timestamp: string
  user?: {
    name: string
    avatar?: string
  }
  icon?: React.ReactNode
}

export interface ActivityFeedProps {
  title?: string
  activities: ActivityItem[]
  maxItems?: number
  onViewAll?: () => void
}

export function ActivityFeed({
  title = 'Recent Activity',
  activities,
  maxItems = 5,
  onViewAll,
}: ActivityFeedProps) {
  const typeColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }

  const displayedActivities = activities.slice(0, maxItems)

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Text className="font-semibold">{title}</Text>
        {onViewAll && activities.length > maxItems && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:underline"
          >
            View all
          </button>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {displayedActivities.map((activity) => (
          <div key={activity.id} className="flex gap-4">
            <div className="relative">
              <div
                className={`h-2 w-2 rounded-full ${typeColors[activity.type]}`}
              />
              {/* Vertical line connecting items */}
              <div className="absolute left-1/2 top-2 h-full w-px -translate-x-1/2 bg-border" />
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <Text className="font-medium">{activity.title}</Text>
                  {activity.description && (
                    <Text className="text-sm text-muted-foreground">
                      {activity.description}
                    </Text>
                  )}
                </div>
                <Text className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </Text>
              </div>
              {activity.user && (
                <div className="mt-2 flex items-center gap-2">
                  {activity.user.avatar ? (
                    <img
                      src={activity.user.avatar}
                      alt={activity.user.name}
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                      {activity.user.name.charAt(0)}
                    </div>
                  )}
                  <Text className="text-sm">{activity.user.name}</Text>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
