'use client'

import { useCallback } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
import { useSearchContext } from './search-provider'
import { SearchFooter } from './search-footer'
import { SearchResultItem } from './components/search-result-item'
import { SearchEmpty } from './components/search-empty'
import type { SearchResult } from '@/lib/searchbox-types'

interface SearchPaletteProps {
  placeholder?: string
}

export function SearchPalette({
  placeholder = 'Search documentation...',
}: SearchPaletteProps) {
  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    results,
    selectResult,
    isLoading,
  } = useSearchContext()

  const handleSelect = useCallback(
    (result: SearchResult) => {
      selectResult(result)
    },
    [selectResult]
  )

  const showEmpty = query && results.length === 0 && !isLoading

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      title="Search"
      description="Search documentation"
      showCloseButton={false}
      shouldFilter={false}
    >
      <CommandInput
        placeholder={placeholder}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Empty state */}
        {showEmpty && (
          <CommandEmpty>
            <SearchEmpty />
          </CommandEmpty>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <div className="py-2">
            {results.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                onSelect={handleSelect}
                query={query}
              />
            ))}
          </div>
        )}
      </CommandList>
      <SearchFooter />
    </CommandDialog>
  )
}
