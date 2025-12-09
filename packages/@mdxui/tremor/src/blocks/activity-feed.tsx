/**
 * Activity Feed
 *
 * Timeline of recent activities/events.
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Card } from '../ui/card'
import { Text } from '../ui/text'
import { Button } from '../ui/button'

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
  icon?: ReactNode
}

export interface ActivityFeedProps extends ComponentPropsWithoutRef<'div'> {
  title?: string
  activities: ActivityItem[]
  maxItems?: number
  onViewAll?: () => void
}

type ActivityFeedElement = HTMLDivElement

const ActivityFeed = forwardRef<ActivityFeedElement, ActivityFeedProps>(
  ({
    title = 'Recent Activity',
    activities,
    maxItems = 5,
    onViewAll,
    className = '',
    ...props
  }, ref) => {
    const typeColors = {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
    }

    const displayedActivities = activities.slice(0, maxItems)

    return (
      <Card ref={ref} className={className} {...props}>
        <div className="flex items-center justify-between">
          <Text className="font-semibold">{title}</Text>
          {onViewAll && activities.length > maxItems && (
            <Button
              variant="light"
              size="sm"
              onClick={onViewAll}
            >
              View all
            </Button>
          )}
        </div>
        <div className="mt-4 space-y-4">
          {displayedActivities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              <div className="relative flex flex-col items-center">
                <div
                  className={`h-2 w-2 rounded-full ${typeColors[activity.type]}`}
                />
                {/* Vertical line connecting items */}
                {index < displayedActivities.length - 1 && (
                  <div className="flex-1 w-px bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Text className="font-medium">{activity.title}</Text>
                    {activity.description && (
                      <Text className="text-sm text-muted-foreground">
                        {activity.description}
                      </Text>
                    )}
                  </div>
                  <Text className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.timestamp}
                  </Text>
                </div>
                {activity.user && (
                  <div className="mt-2 flex items-center gap-2">
                    {activity.user.avatar ? (
                      <img
                        src={activity.user.avatar}
                        alt={activity.user.name}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {activity.user.name.charAt(0).toUpperCase()}
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
)
ActivityFeed.displayName = 'ActivityFeed'

export { ActivityFeed }
