'use client'

import { Hash, ChevronRight } from 'lucide-react'
import { CommandItem } from '@/components/ui/command'
import type { SearchResultItemProps, SearchMatch } from '@/lib/searchbox-types'

function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex).filter((part) => part !== '')

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-chart-1! dark:text-chart-2!">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  )
}

export function SearchResultItem({ result, onSelect, query = '' }: SearchResultItemProps) {
  return (
    <div>
      {/* Document header */}
      <CommandItem
        value={`${result.id}-${result.title}`}
        onSelect={() => onSelect(result)}
        className="flex flex-col items-start gap-0.5 mx-2 px-3 py-2 rounded-md"
      >
        {/* Breadcrumb */}
        {result.breadcrumbs && result.breadcrumbs.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            {result.breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="h-2.5 w-2.5" />}
                {crumb}
              </span>
            ))}
          </span>
        )}
        <span className="font-semibold">{result.title}</span>
      </CommandItem>

      {/* Matches */}
      {result.matches.length > 0 && (
        <div className="mx-2 ml-5 border-l border-border">
          {result.matches.map((match, i) => (
            <MatchItem
              key={i}
              match={match}
              resultId={result.id}
              index={i}
              onSelect={() => onSelect(result)}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchItem({
  match,
  resultId,
  index,
  onSelect,
  query,
}: {
  match: SearchMatch
  resultId: string
  index: number
  onSelect: () => void
  query: string
}) {
  if (match.type === 'section') {
    return (
      <CommandItem
        value={`${resultId}-section-${match.heading}-${index}`}
        onSelect={onSelect}
        className="flex flex-col items-start gap-1 ml-2 px-3 py-2 rounded-md"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{highlightMatches(match.heading, query)}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          {highlightMatches(match.snippet, query)}
        </span>
      </CommandItem>
    )
  }

  // Content match
  return (
    <CommandItem
      value={`${resultId}-content-${index}`}
      onSelect={onSelect}
      className="flex items-start ml-2 px-3 py-2 rounded-md"
    >
      <span className="text-sm text-muted-foreground">
        {highlightMatches(match.snippet, query)}
      </span>
    </CommandItem>
  )
}
