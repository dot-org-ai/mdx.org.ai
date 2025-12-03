'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import type {
  SearchResult,
  SearchContextValue,
  SearchProviderProps,
} from '@/lib/searchbox-types'

const SearchContext = createContext<SearchContextValue | null>(null)

const DEFAULT_DEBOUNCE_MS = 150

export function useSearchContext() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchContext must be used within SearchProvider')
  }
  return context
}

export function SearchProvider({
  children,
  documents = [],
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: SearchProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset query when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setError(null)
    }
  }, [isOpen])

  // Search when query changes
  useEffect(() => {
    if (!query) {
      setResults([])
      setError(null)
      return
    }

    setIsLoading(true)

    const timer = setTimeout(() => {
      const filtered = filterDocuments(documents, query)
      setResults(filtered)
      setIsLoading(false)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, documents, debounceMs])

  const selectResult = useCallback((result: SearchResult) => {
    // Navigate to the result URL
    if (result.url) {
      window.location.href = result.url
    }
    setQuery('')
    setIsOpen(false)
  }, [])

  const contextValue = useMemo<SearchContextValue>(
    () => ({
      isOpen,
      setIsOpen,
      query,
      setQuery,
      results,
      isLoading,
      error,
      selectResult,
    }),
    [isOpen, query, results, isLoading, error, selectResult]
  )

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  )
}

function filterDocuments(documents: SearchResult[], query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase()

  return documents
    .map((doc) => {
      // Calculate relevance score based on matches
      let score = 0

      // Title match (highest weight)
      if (doc.title.toLowerCase().includes(lowerQuery)) {
        score += 10
      }

      // Tag match
      if (doc.tag?.toLowerCase().includes(lowerQuery)) {
        score += 5
      }

      // Breadcrumb match
      if (doc.breadcrumbs?.some((b) => b.toLowerCase().includes(lowerQuery))) {
        score += 3
      }

      // Match content and sections
      const matchingMatches = doc.matches.filter((m) => {
        if (m.type === 'section') {
          return (
            m.heading.toLowerCase().includes(lowerQuery) ||
            m.snippet.toLowerCase().includes(lowerQuery)
          )
        }
        return m.snippet.toLowerCase().includes(lowerQuery)
      })
      score += matchingMatches.length * 2

      return { doc, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ doc }) => doc)
}
