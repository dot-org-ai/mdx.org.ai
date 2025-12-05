import type { ReactNode } from 'react'

export type ErrorPageCode = 404 | 500 | 403 | 401 | 503

export interface ErrorPageProps {
  code: ErrorPageCode
  title?: string
  description?: string
  action?: { label: string; href: string }
  showHomeLink?: boolean
  showBackButton?: boolean
  illustration?: ReactNode
}

const defaultContent: Record<ErrorPageCode, { title: string; description: string }> = {
  404: {
    title: 'Page not found',
    description: "The page you're looking for doesn't exist.",
  },
  500: {
    title: 'Server error',
    description: 'Something went wrong on our end.',
  },
  403: {
    title: 'Access denied',
    description: "You don't have permission to access this page.",
  },
  401: {
    title: 'Authentication required',
    description: 'Please sign in to continue.',
  },
  503: {
    title: 'Service unavailable',
    description: "We're performing maintenance.",
  },
}

export function ErrorPage({
  code,
  title,
  description,
  action,
  showHomeLink = true,
  showBackButton = true,
  illustration,
}: ErrorPageProps) {
  const content = defaultContent[code]
  const pageTitle = title || content.title
  const pageDescription = description || content.description

  return (
    <main aria-label="Error">
      <article data-error-code={code}>
        {illustration ? (
          <div data-illustration="">{illustration}</div>
        ) : (
          <div data-error-code-display="">
            <span>{code}</span>
          </div>
        )}

        <h1>{pageTitle}</h1>
        <p>{pageDescription}</p>

        <nav>
          {action && (
            <a href={action.href} data-primary-action="">
              {action.label}
            </a>
          )}

          {!action && code === 401 && (
            <a href="/login" data-primary-action="">
              Sign in
            </a>
          )}

          {showHomeLink && (
            <a href="/" data-secondary-action="">
              Go to homepage
            </a>
          )}

          {showBackButton && (
            <button
              type="button"
              onClick={() => window.history.back()}
              data-secondary-action=""
            >
              Go back
            </button>
          )}
        </nav>

        {renderAdditionalContent(code)}
      </article>
    </main>
  )
}

function renderAdditionalContent(code: ErrorPageCode): ReactNode {
  switch (code) {
    case 404:
      return (
        <footer data-help-text="">
          <p>
            If you believe this is a mistake, please{' '}
            <a href="/contact">contact support</a>.
          </p>
        </footer>
      )

    case 500:
      return (
        <footer data-help-text="">
          <p>
            Our team has been notified. Please try again later or{' '}
            <a href="/status">check our status page</a>.
          </p>
        </footer>
      )

    case 503:
      return (
        <footer data-help-text="">
          <p>
            We'll be back shortly. Follow us on{' '}
            <a href="/status">our status page</a> for updates.
          </p>
        </footer>
      )

    case 403:
      return (
        <footer data-help-text="">
          <p>
            If you need access, please{' '}
            <a href="/contact">request permission</a>.
          </p>
        </footer>
      )

    default:
      return null
  }
}
