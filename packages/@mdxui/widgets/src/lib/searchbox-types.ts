// Content snippet match (plain text that matched)
export interface ContentMatch {
  type: 'content'
  snippet: string
}

// Section heading match (# heading that matched)
export interface SectionMatch {
  type: 'section'
  heading: string
  snippet: string
}

export type SearchMatch = ContentMatch | SectionMatch

// Search result item (document-focused)
export interface SearchResult {
  id: string
  title: string
  url: string
  tag?: string
  breadcrumbs?: string[]
  matches: SearchMatch[]
}

// Context value exposed by SearchProvider
export interface SearchContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  selectResult: (result: SearchResult) => void
}

// Props for SearchProvider
export interface SearchProviderProps {
  children: React.ReactNode
  documents?: SearchResult[]
  debounceMs?: number
}

// Props for SearchTrigger
export interface SearchTriggerProps {
  onClick: () => void
  className?: string
}

// Props for SearchResultItem
export interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
  query?: string
}
