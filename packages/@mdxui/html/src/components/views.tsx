/**
 * View Components
 *
 * React wrappers for semantic HTML main content views.
 * These components render <main aria-label="..."> with appropriate structure.
 */

import * as React from 'react'

export type ViewType =
  | 'Dashboard'
  | 'Developer'
  | 'Table'
  | 'Grid'
  | 'List'
  | 'Chat'
  | 'Form'
  | 'Detail'
  | 'Settings'
  | 'Profile'
  | 'Editor'
  | 'Calendar'
  | 'Kanban'

export interface ViewProps {
  /** View type determines styling */
  type: ViewType
  children: React.ReactNode
}

/**
 * Generic view wrapper with aria-label
 */
export function View({ type, children }: ViewProps) {
  return <main aria-label={type}>{children}</main>
}

/* ==========================================================================
   Dashboard View
   ========================================================================== */

export interface DashboardStatProps {
  label: string
  value: string | number
  change?: {
    value: string
    type: 'positive' | 'negative' | 'neutral'
  }
}

export interface DashboardViewProps {
  title?: string
  actions?: React.ReactNode
  stats?: DashboardStatProps[]
  children?: React.ReactNode
}

export function DashboardView({ title, actions, stats, children }: DashboardViewProps) {
  return (
    <main aria-label="Dashboard">
      {(title || actions) && (
        <header>
          {title && <h1>{title}</h1>}
          {actions && <div>{actions}</div>}
        </header>
      )}
      {stats && stats.length > 0 && (
        <section data-stats>
          {stats.map((stat, i) => (
            <article key={i}>
              <h3>{stat.label}</h3>
              <span data-value>{stat.value}</span>
              {stat.change && (
                <span data-change={stat.change.type}>{stat.change.value}</span>
              )}
            </article>
          ))}
        </section>
      )}
      {children}
    </main>
  )
}

/* ==========================================================================
   Developer Dashboard View
   ========================================================================== */

export interface APIKey {
  id: string
  name: string
  key: string
  createdAt?: string
}

export interface UsageStat {
  label: string
  value: string | number
}

export interface DeveloperViewProps {
  title?: string
  actions?: React.ReactNode
  apiKeys?: APIKey[]
  usage?: UsageStat[]
  children?: React.ReactNode
}

export function DeveloperView({ title, actions, apiKeys, usage, children }: DeveloperViewProps) {
  return (
    <main aria-label="Developer">
      {(title || actions) && (
        <header>
          {title && <h1>{title}</h1>}
          {actions && <div>{actions}</div>}
        </header>
      )}
      <section>
        {apiKeys?.map((apiKey) => (
          <article key={apiKey.id} data-type="api-key">
            <header>
              <h3>{apiKey.name}</h3>
              {apiKey.createdAt && <time>{apiKey.createdAt}</time>}
            </header>
            <code>{apiKey.key}</code>
          </article>
        ))}
        {children}
      </section>
      {usage && usage.length > 0 && (
        <aside>
          <article data-type="usage">
            <h3>Usage</h3>
            <dl>
              {usage.map((stat, i) => (
                <React.Fragment key={i}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </article>
        </aside>
      )}
    </main>
  )
}

/* ==========================================================================
   Chat View
   ========================================================================== */

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant' | 'system'
  content: string
  avatar?: string
  timestamp?: string
}

export interface ChatViewProps {
  title?: string
  messages: ChatMessage[]
  onSend?: (message: string) => void
  placeholder?: string
  children?: React.ReactNode
}

export function ChatView({
  title,
  messages,
  onSend,
  placeholder = 'Type a message...',
  children,
}: ChatViewProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const message = formData.get('message') as string
    if (message.trim()) {
      onSend?.(message)
      e.currentTarget.reset()
    }
  }

  return (
    <main aria-label="Chat">
      {title && (
        <header>
          <h1>{title}</h1>
        </header>
      )}
      <section>
        {messages.map((message) => (
          <article key={message.id} data-sender={message.sender}>
            {message.avatar && <img src={message.avatar} alt={message.sender} />}
            <div>{message.content}</div>
          </article>
        ))}
        {children}
      </section>
      <footer>
        <form onSubmit={handleSubmit}>
          <input type="text" name="message" placeholder={placeholder} autoComplete="off" />
          <button type="submit">Send</button>
        </form>
      </footer>
    </main>
  )
}

/* ==========================================================================
   Grid View
   ========================================================================== */

export interface GridItem {
  id: string
  title: string
  description?: string
  image?: string
  href?: string
  onClick?: () => void
}

export interface GridViewProps {
  title?: string
  actions?: React.ReactNode
  items: GridItem[]
  children?: React.ReactNode
}

export function GridView({ title, actions, items, children }: GridViewProps) {
  return (
    <main aria-label="Grid">
      {(title || actions) && (
        <header>
          {title && <h1>{title}</h1>}
          {actions && <div>{actions}</div>}
        </header>
      )}
      <div>
        {items.map((item) => (
          <article
            key={item.id}
            onClick={item.onClick || (item.href ? () => (window.location.href = item.href!) : undefined)}
          >
            {item.image && <img src={item.image} alt={item.title} />}
            <div>
              <h2>{item.title}</h2>
              {item.description && <p>{item.description}</p>}
            </div>
          </article>
        ))}
      </div>
      {children}
    </main>
  )
}

/* ==========================================================================
   List View
   ========================================================================== */

export interface ListItem {
  id: string
  content: React.ReactNode
  selected?: boolean
  onClick?: () => void
}

export interface ListViewProps {
  title?: string
  actions?: React.ReactNode
  items: ListItem[]
  children?: React.ReactNode
}

export function ListView({ title, actions, items, children }: ListViewProps) {
  return (
    <main aria-label="List">
      {(title || actions) && (
        <header>
          {title && <h1>{title}</h1>}
          {actions && <div>{actions}</div>}
        </header>
      )}
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            aria-selected={item.selected || undefined}
            onClick={item.onClick}
          >
            {item.content}
          </li>
        ))}
      </ul>
      {children}
    </main>
  )
}

/* ==========================================================================
   Form View
   ========================================================================== */

export interface FormViewProps {
  title?: string
  description?: string
  onSubmit?: (data: FormData) => void
  children: React.ReactNode
  actions?: React.ReactNode
}

export function FormView({ title, description, onSubmit, children, actions }: FormViewProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit?.(formData)
  }

  return (
    <main aria-label="Form">
      {(title || description) && (
        <header>
          {title && <h1>{title}</h1>}
          {description && <p>{description}</p>}
        </header>
      )}
      <form onSubmit={handleSubmit}>
        {children}
        {actions && <footer>{actions}</footer>}
      </form>
    </main>
  )
}

/* ==========================================================================
   Settings View
   ========================================================================== */

export interface SettingsSection {
  id: string
  title: string
  description?: string
  content: React.ReactNode
}

export interface SettingsViewProps {
  title?: string
  sections: SettingsSection[]
}

export function SettingsView({ title, sections }: SettingsViewProps) {
  return (
    <main aria-label="Settings">
      {title && (
        <header>
          <h1>{title}</h1>
        </header>
      )}
      {sections.map((section) => (
        <section key={section.id}>
          <header>
            <h2>{section.title}</h2>
            {section.description && <p>{section.description}</p>}
          </header>
          <div>{section.content}</div>
        </section>
      ))}
    </main>
  )
}

/* ==========================================================================
   Profile View
   ========================================================================== */

export interface ProfileViewProps {
  name: string
  bio?: string
  avatar?: string
  children?: React.ReactNode
}

export function ProfileView({ name, bio, avatar, children }: ProfileViewProps) {
  return (
    <main aria-label="Profile">
      <header>
        {avatar && <img src={avatar} alt={name} />}
        <h1>{name}</h1>
        {bio && <p>{bio}</p>}
      </header>
      {children}
    </main>
  )
}

/* ==========================================================================
   Editor View
   ========================================================================== */

export interface EditorViewProps {
  title?: string
  actions?: React.ReactNode
  value?: string
  onChange?: (value: string) => void
  language?: string
  footer?: React.ReactNode
}

export function EditorView({ title, actions, value, onChange, footer }: EditorViewProps) {
  return (
    <main aria-label="Editor">
      {(title || actions) && (
        <header>
          {title && <span>{title}</span>}
          {actions && <div>{actions}</div>}
        </header>
      )}
      <section>
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          spellCheck={false}
        />
      </section>
      {footer && <footer>{footer}</footer>}
    </main>
  )
}

/* ==========================================================================
   Kanban View
   ========================================================================== */

export interface KanbanCard {
  id: string
  content: React.ReactNode
}

export interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
}

export interface KanbanViewProps {
  title?: string
  columns: KanbanColumn[]
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string) => void
}

export function KanbanView({ title, columns }: KanbanViewProps) {
  return (
    <main aria-label="Kanban">
      {title && (
        <header>
          <h1>{title}</h1>
        </header>
      )}
      <div>
        {columns.map((column) => (
          <section key={column.id}>
            <header>
              <h2>{column.title}</h2>
            </header>
            <div>
              {column.cards.map((card) => (
                <article key={card.id} draggable>
                  {card.content}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
