/**
 * Waitlist Components
 *
 * Components for building waitlist/signup pages with semantic HTML.
 */

import * as React from 'react'

/* ==========================================================================
   Waitlist Form
   ========================================================================== */

export interface WaitlistFormProps {
  /** Input placeholder text */
  placeholder?: string
  /** Button text */
  buttonText?: string
  /** Form variant */
  variant?: 'default' | 'inline'
  /** Success callback */
  onSuccess?: (email: string) => void
  /** Error callback */
  onError?: (error: string) => void
  /** API endpoint for submission */
  action?: string
  /** Tracking source */
  source?: string
}

export function WaitlistForm({
  placeholder = 'Enter your email',
  buttonText = 'Join waitlist',
  variant = 'default',
  onSuccess,
  onError,
  action = '/api/waitlist',
  source = 'website',
}: WaitlistFormProps) {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic email validation
    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/
    if (!emailRegex.test(email)) {
      onError?.('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onSuccess?.(email)
        setEmail('')
      } else {
        onError?.(data.error || 'Something went wrong')
      }
    } catch {
      onError?.('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-variant={variant}>
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        required
        disabled={loading}
        aria-label="Email address"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Joining...' : buttonText}
      </button>
    </form>
  )
}

/* ==========================================================================
   Waitlist Section
   ========================================================================== */

export interface WaitlistProps {
  /** Eyebrow/tagline text */
  eyebrow?: string
  /** Main headline */
  headline: string
  /** Description text */
  description?: string
  /** Form placeholder */
  placeholder?: string
  /** Button text */
  buttonText?: string
  /** Form variant */
  formVariant?: 'default' | 'inline'
  /** Background type */
  background?: 'none' | 'dots' | 'grid' | 'grid-fade' | 'radial' | 'radial-top' | 'gradient' | 'gradient-radial' | 'waves' | 'aurora' | 'spotlight' | 'animated-gradient' | 'noise' | 'glass' | 'striped'
  /** Success callback */
  onSuccess?: (email: string) => void
  /** Error callback */
  onError?: (error: string) => void
  /** API endpoint */
  action?: string
  /** Tracking source */
  source?: string
  /** Additional content below form */
  children?: React.ReactNode
}

export function Waitlist({
  eyebrow,
  headline,
  description,
  placeholder,
  buttonText,
  formVariant = 'inline',
  background = 'none',
  onSuccess,
  onError,
  action,
  source,
  children,
}: WaitlistProps) {
  return (
    <section
      aria-label="Waitlist"
      data-background={background !== 'none' ? background : undefined}
    >
      <div>
        {eyebrow && <small>{eyebrow}</small>}
        <h1>{headline}</h1>
        {description && <p>{description}</p>}
        <WaitlistForm
          placeholder={placeholder}
          buttonText={buttonText}
          variant={formVariant}
          onSuccess={onSuccess}
          onError={onError}
          action={action}
          source={source}
        />
        {children}
      </div>
    </section>
  )
}

/* ==========================================================================
   Waitlist Page (Full Layout)
   ========================================================================== */

export interface WaitlistPageProps {
  /** Navbar content */
  navbar?: React.ReactNode
  /** Waitlist section props */
  waitlist: Omit<WaitlistProps, 'children'>
  /** Additional sections */
  children?: React.ReactNode
  /** Footer content */
  footer?: React.ReactNode
  /** Theme */
  theme?: 'light' | 'dark' | 'auto'
}

export function WaitlistPage({
  navbar,
  waitlist,
  children,
  footer,
  theme = 'auto',
}: WaitlistPageProps) {
  React.useEffect(() => {
    document.body.setAttribute('data-layout', 'site')
    if (theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', theme)
    }
    return () => {
      document.body.removeAttribute('data-layout')
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  return (
    <>
      {navbar && <header>{navbar}</header>}
      <main>
        <Waitlist {...waitlist} />
        {children}
      </main>
      {footer && <footer>{footer}</footer>}
    </>
  )
}

/* ==========================================================================
   Simple Navbar for Waitlist
   ========================================================================== */

export interface WaitlistNavbarProps {
  /** Logo/brand content */
  logo?: React.ReactNode
  /** Brand text */
  brandText?: string
  /** Home link */
  homeHref?: string
  /** Additional navigation items */
  children?: React.ReactNode
}

export function WaitlistNavbar({
  logo,
  brandText,
  homeHref = '/',
  children,
}: WaitlistNavbarProps) {
  return (
    <nav>
      <a href={homeHref}>
        {logo}
        {brandText && <span>{brandText}</span>}
      </a>
      {children}
    </nav>
  )
}

/* ==========================================================================
   Highlight/Features Section for Waitlist
   ========================================================================== */

export interface HighlightItem {
  icon?: React.ReactNode
  title: string
  description: string
}

export interface HighlightProps {
  items: HighlightItem[]
}

export function Highlight({ items }: HighlightProps) {
  return (
    <section aria-label="Features" data-style="cards">
      <div>
        {items.map((item, i) => (
          <article key={i}>
            {item.icon && <div>{item.icon}</div>}
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ==========================================================================
   Bento Grid Section (Waitlist variant)
   ========================================================================== */

export interface WaitlistBentoItem {
  title: string
  description: string
  href?: string
  span?: 'single' | 'double'
  content?: React.ReactNode
}

export interface WaitlistBentoProps {
  headline?: string
  description?: string
  items: WaitlistBentoItem[]
}

export function Bento({ headline, description, items }: WaitlistBentoProps) {
  return (
    <section aria-label="Features">
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div data-grid="bento">
        {items.map((item, i) => {
          const content = (
            <>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              {item.content}
            </>
          )

          return item.href ? (
            <a key={i} href={item.href} data-span={item.span}>
              {content}
            </a>
          ) : (
            <article key={i} data-span={item.span}>
              {content}
            </article>
          )
        })}
      </div>
    </section>
  )
}
