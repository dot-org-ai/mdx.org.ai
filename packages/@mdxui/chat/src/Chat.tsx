'use client'

import * as React from 'react'

/** Message role type */
export type MessageRole = 'user' | 'assistant' | 'system'

/** Chat message structure */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp?: Date
  /** Optional metadata (tool calls, sources, etc.) */
  metadata?: Record<string, unknown>
  /** Whether message is still streaming */
  isStreaming?: boolean
}

/** Chat layout variant */
export type ChatVariant = 'default' | 'sidebar' | 'inline' | 'fullscreen'

/** Theme configuration */
export interface ChatTheme {
  /** Background color */
  background?: string
  /** Text color */
  foreground?: string
  /** User message background */
  userBubble?: string
  /** Assistant message background */
  assistantBubble?: string
  /** Input background */
  inputBackground?: string
  /** Border color */
  border?: string
  /** Accent color */
  accent?: string
}

export interface ChatProps {
  /** Chat messages */
  messages?: ChatMessage[]
  /** Called when user sends a message */
  onSendMessage?: (message: string) => void
  /** Whether chat is loading/thinking */
  loading?: boolean
  /** Loading text (default: "Thinking...") */
  loadingText?: string
  /** Placeholder text for input */
  placeholder?: string
  /** Chat title */
  title?: string
  /** Layout variant */
  variant?: ChatVariant
  /** Width (for sidebar variant) */
  width?: number | string
  /** Height */
  height?: number | string
  /** Theme configuration */
  theme?: ChatTheme
  /** Whether to use dark mode */
  darkMode?: boolean
  /** Custom message renderer */
  renderMessage?: (message: ChatMessage) => React.ReactNode
  /** Custom input renderer */
  renderInput?: (props: {
    value: string
    onChange: (value: string) => void
    onSubmit: () => void
    loading: boolean
  }) => React.ReactNode
  /** Show timestamps */
  showTimestamps?: boolean
  /** Show avatars */
  showAvatars?: boolean
  /** User avatar */
  userAvatar?: React.ReactNode
  /** Assistant avatar */
  assistantAvatar?: React.ReactNode
  /** Header actions */
  headerActions?: React.ReactNode
  /** Footer content (above input) */
  footer?: React.ReactNode
  /** CSS class name */
  className?: string
  /** Inline styles */
  style?: React.CSSProperties
  /** Auto-scroll to bottom on new messages */
  autoScroll?: boolean
  /** Disable input */
  disabled?: boolean
}

const defaultDarkTheme: ChatTheme = {
  background: 'rgba(0,0,0,0.2)',
  foreground: '#ffffff',
  userBubble: 'rgba(59,130,246,0.2)',
  assistantBubble: 'rgba(255,255,255,0.05)',
  inputBackground: 'rgba(0,0,0,0.3)',
  border: 'rgba(255,255,255,0.1)',
  accent: '#3b82f6',
}

const defaultLightTheme: ChatTheme = {
  background: '#ffffff',
  foreground: '#1f2937',
  userBubble: '#dbeafe',
  assistantBubble: '#f3f4f6',
  inputBackground: '#ffffff',
  border: '#e5e7eb',
  accent: '#3b82f6',
}

/** Default message component */
function DefaultMessage({
  message,
  theme,
  showTimestamp,
  showAvatar,
  userAvatar,
  assistantAvatar,
}: {
  message: ChatMessage
  theme: ChatTheme
  showTimestamp?: boolean
  showAvatar?: boolean
  userAvatar?: React.ReactNode
  assistantAvatar?: React.ReactNode
}) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {showAvatar && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isUser ? theme.accent : theme.assistantBubble,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {isUser
            ? userAvatar || '👤'
            : assistantAvatar || '🤖'}
        </div>
      )}
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: 12,
          background: isUser ? theme.userBubble : theme.assistantBubble,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
        {message.isStreaming && (
          <span style={{ opacity: 0.5 }}>▌</span>
        )}
        {showTimestamp && message.timestamp && (
          <div
            style={{
              fontSize: 11,
              opacity: 0.5,
              marginTop: 4,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {message.timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}

/** Default input component */
function DefaultInput({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder,
  theme,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
  placeholder: string
  theme: ChatTheme
  disabled?: boolean
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        style={{
          flex: 1,
          padding: '10px 14px',
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          background: theme.inputBackground,
          color: theme.foreground,
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || loading || !value.trim()}
        style={{
          padding: '10px 16px',
          background: theme.accent,
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          cursor: disabled || loading || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: disabled || loading || !value.trim() ? 0.5 : 1,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Send
      </button>
    </div>
  )
}

/**
 * AI Chat component with customizable appearance and behavior
 */
export function Chat({
  messages = [],
  onSendMessage,
  loading = false,
  loadingText = 'Thinking...',
  placeholder = 'Type a message...',
  title = 'Chat',
  variant = 'default',
  width,
  height = 400,
  theme: themeProp,
  darkMode = true,
  renderMessage,
  renderInput,
  showTimestamps = false,
  showAvatars = false,
  userAvatar,
  assistantAvatar,
  headerActions,
  footer,
  className,
  style,
  autoScroll = true,
  disabled = false,
}: ChatProps) {
  const [input, setInput] = React.useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const theme = {
    ...(darkMode ? defaultDarkTheme : defaultLightTheme),
    ...themeProp,
  }

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, autoScroll])

  const handleSubmit = () => {
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  // Calculate dimensions based on variant
  const getContainerStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      background: theme.background,
      color: theme.foreground,
      borderRadius: variant === 'sidebar' ? 0 : 8,
      overflow: 'hidden',
      ...style,
    }

    switch (variant) {
      case 'sidebar':
        return {
          ...base,
          width: width || 320,
          height: '100%',
          borderLeft: `1px solid ${theme.border}`,
        }
      case 'inline':
        return {
          ...base,
          width: width || '100%',
          height: height,
          border: `1px solid ${theme.border}`,
        }
      case 'fullscreen':
        return {
          ...base,
          width: '100%',
          height: '100%',
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 0,
          zIndex: 50,
        }
      default:
        return {
          ...base,
          width: width || '100%',
          height: height,
        }
    }
  }

  return (
    <div className={className} style={getContainerStyle()}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {title}
        </div>
        {headerActions}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
        }}
      >
        {messages.map((message) =>
          renderMessage ? (
            <React.Fragment key={message.id}>
              {renderMessage(message)}
            </React.Fragment>
          ) : (
            <DefaultMessage
              key={message.id}
              message={message}
              theme={theme}
              showTimestamp={showTimestamps}
              showAvatar={showAvatars}
              userAvatar={userAvatar}
              assistantAvatar={assistantAvatar}
            />
          )
        )}
        {loading && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: theme.assistantBubble,
              fontSize: 14,
              opacity: 0.7,
              display: 'inline-block',
            }}
          >
            {loadingText}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      {footer && (
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${theme.border}` }}>
          {footer}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: 16,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        {renderInput ? (
          renderInput({
            value: input,
            onChange: setInput,
            onSubmit: handleSubmit,
            loading,
          })
        ) : (
          <DefaultInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            loading={loading}
            placeholder={placeholder}
            theme={theme}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}

export default Chat
