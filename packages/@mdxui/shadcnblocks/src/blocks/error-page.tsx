/**
 * Error Page Blocks (GAP: Not in @mdxui/html)
 */

import * as React from 'react'
import type { ErrorPageBlockProps } from '../types'

const errorDefaults = {
  404: { title: 'Page not found', description: "Sorry, we couldn't find the page you're looking for." },
  500: { title: 'Server error', description: 'Something went wrong on our end. Please try again later.' },
  403: { title: 'Access denied', description: "You don't have permission to access this page." },
  401: { title: 'Authentication required', description: 'Please sign in to access this page.' },
}

export function ErrorPage({ code, title, description, action }: ErrorPageBlockProps) {
  const defaults = errorDefaults[code]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-9xl font-bold text-muted-foreground/20">{code}</p>
      <h1 className="mt-6 text-3xl font-bold">{title || defaults.title}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        {description || defaults.description}
      </p>
      {action && (
        <a
          href={action.href}
          className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}

export function Error404(props: Omit<ErrorPageBlockProps, 'code'>) {
  return <ErrorPage code={404} {...props} action={props.action || { label: 'Go back home', href: '/' }} />
}

export function Error500(props: Omit<ErrorPageBlockProps, 'code'>) {
  return <ErrorPage code={500} {...props} action={props.action || { label: 'Try again', href: '/' }} />
}

export const Errors = { Page: ErrorPage, NotFound: Error404, ServerError: Error500 }
