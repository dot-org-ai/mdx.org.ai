export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isError?: boolean
}

export interface ChatBoxConfig {
  /** Primary color (default: brand primary) */
  themeColor?: string
  /** Trigger position */
  position?: 'bottom-right' | 'bottom-left'
  /** Header title (default: "Support") */
  title?: string
  /** Avatar image URL (default: "/org-ai.png") */
  avatar?: string
  /** Initial greeting */
  welcomeMessage?: string
  /** Input placeholder */
  placeholder?: string
  /** Auto-open on load (default: false) */
  showOnMount?: boolean
  /** Save messages in localStorage (default: true) */
  persistSession?: boolean
  /** Show email prompt (default: true) */
  enableEmailCapture?: boolean
  /** Messages before prompt (default: 1) */
  emailPromptDelay?: number
  /** API URL (default: https://apis.do/chat) */
  apiEndpoint?: string
}

export interface ChatContextValue {
  messages: Message[]
  isTyping: boolean
  showEmailCapture: boolean
  email: string | null
  sessionId: string
  isOpen: boolean
  unreadCount: number
  config: ChatBoxConfig
  sendMessage: (content: string) => Promise<void>
  retryLastMessage: () => Promise<void>
  captureEmail: (email: string) => Promise<void>
  dismissEmailCapture: () => void
  setIsOpen: (open: boolean) => void
  markAsRead: () => void
}
