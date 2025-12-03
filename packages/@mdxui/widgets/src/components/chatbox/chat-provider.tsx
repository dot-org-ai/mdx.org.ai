'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Message, ChatContextValue, ChatBoxConfig } from './lib/types'

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

interface ChatProviderProps {
  children: ReactNode
  config?: ChatBoxConfig
}

export function ChatProvider({ children, config = {} }: ChatProviderProps) {
  const {
    apiEndpoint = 'https://apis.do/chat',
    enableEmailCapture = true,
    emailPromptDelay = 1,
    persistSession = true,
  } = config

  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [sessionId] = useState(() => generateSessionId())
  const [hasShownEmailCapture, setHasShownEmailCapture] = useState(false)
  const [isOpen, setIsOpen] = useState(config.showOnMount ?? false)
  const [assistantResponseCount, setAssistantResponseCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const lastUserMessageRef = useRef<string | null>(null)

  // Load persisted state
  useEffect(() => {
    if (!persistSession) return

    const saved = localStorage.getItem(`chatbox-${sessionId}`)
    if (saved) {
      try {
        const { messages: savedMessages, email: savedEmail } = JSON.parse(saved)
        setMessages(
          savedMessages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        )
        setEmail(savedEmail)
      } catch {
        // Ignore parse errors
      }
    }
  }, [sessionId, persistSession])

  // Persist state
  useEffect(() => {
    if (!persistSession) return

    if (messages.length > 0 || email) {
      localStorage.setItem(
        `chatbox-${sessionId}`,
        JSON.stringify({
          messages,
          email,
        })
      )
    }
  }, [messages, email, sessionId, persistSession])

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  const sendMessage = useCallback(
    async (content: string) => {
      lastUserMessageRef.current = content

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsTyping(true)

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: content,
            email,
          }),
        })

        const data = await response.json()

        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])

        // Increment unread if chat is closed
        if (!isOpen) {
          setUnreadCount((prev) => prev + 1)
        }

        const newCount = assistantResponseCount + 1
        setAssistantResponseCount(newCount)

        // Show email capture after configured number of AI responses
        if (enableEmailCapture && !hasShownEmailCapture && !email && newCount >= emailPromptDelay) {
          setShowEmailCapture(true)
          setHasShownEmailCapture(true)
        }
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting. Please try again.",
          timestamp: new Date(),
          isError: true,
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsTyping(false)
      }
    },
    [apiEndpoint, sessionId, email, hasShownEmailCapture, enableEmailCapture, emailPromptDelay, assistantResponseCount, isOpen]
  )

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return

    // Remove the last error message
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.isError) {
        return prev.slice(0, -1)
      }
      return prev
    })

    // Also remove the last user message since sendMessage will add it again
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.role === 'user') {
        return prev.slice(0, -1)
      }
      return prev
    })

    // Retry sending
    await sendMessage(lastUserMessageRef.current)
  }, [sendMessage])

  const captureEmail = useCallback(
    async (newEmail: string) => {
      await fetch(`${apiEndpoint}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: newEmail }),
      })
      setEmail(newEmail)
      setShowEmailCapture(false)
    },
    [apiEndpoint, sessionId]
  )

  const dismissEmailCapture = useCallback(() => {
    setShowEmailCapture(false)
  }, [])

  const markAsRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return (
    <ChatContext.Provider
      value={{
        messages,
        isTyping,
        showEmailCapture,
        email,
        sessionId,
        isOpen,
        unreadCount,
        config,
        sendMessage,
        retryLastMessage,
        captureEmail,
        dismissEmailCapture,
        setIsOpen,
        markAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
