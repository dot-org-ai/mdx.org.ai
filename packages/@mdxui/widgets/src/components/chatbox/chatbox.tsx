'use client'

import { ChatProvider, useChatContext } from './chat-provider'
import { ChatTrigger } from './chat-trigger'
import { ChatPanel } from './chat-panel'
import type { ChatBoxConfig } from './lib/types'

interface ChatBoxProps extends ChatBoxConfig {}

function ChatBoxContent() {
  const { isOpen, setIsOpen, config, unreadCount } = useChatContext()

  const handleToggle = () => setIsOpen(!isOpen)
  const handleClose = () => setIsOpen(false)

  return (
    <>
      <ChatTrigger isOpen={isOpen} onToggle={handleToggle} position={config.position} unreadCount={unreadCount} />
      <ChatPanel
        isOpen={isOpen}
        onClose={handleClose}
        position={config.position}
        title={config.title}
        avatar={config.avatar}
      />
    </>
  )
}

export function ChatBox(props: ChatBoxProps) {
  return (
    <ChatProvider config={props}>
      <ChatBoxContent />
    </ChatProvider>
  )
}
