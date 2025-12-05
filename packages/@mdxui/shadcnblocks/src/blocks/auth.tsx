/**
 * Auth Blocks (GAP: Not in @mdxui/html)
 */

import * as React from 'react'
import type { AuthBlockProps } from '../types'

export function AuthCentered({ type, title, description, socialProviders, onSubmit }: AuthBlockProps) {
  const defaultTitles = {
    login: 'Welcome back',
    signup: 'Create an account',
    'forgot-password': 'Forgot password?',
    'reset-password': 'Reset password',
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    formData.forEach((value, key) => { data[key] = value.toString() })
    onSubmit?.(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{title || defaultTitles[type]}</h1>
          {description && <p className="mt-2 text-muted-foreground">{description}</p>}
        </div>
        {socialProviders && socialProviders.length > 0 && (
          <div className="mt-8 space-y-3">
            {socialProviders.map((provider) => (
              <button
                key={provider}
                className="flex w-full items-center justify-center gap-3 rounded-md border py-3 text-sm font-medium hover:bg-accent"
              >
                {provider === 'google' && <span>Continue with Google</span>}
                {provider === 'github' && <span>Continue with GitHub</span>}
                {provider === 'apple' && <span>Continue with Apple</span>}
              </button>
            ))}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {(type === 'login' || type === 'signup') && (
            <div>
              <label className="text-sm font-medium">Email</label>
              <input name="email" type="email" required className="mt-1 block w-full rounded-md border px-4 py-2" />
            </div>
          )}
          {(type === 'login' || type === 'signup' || type === 'reset-password') && (
            <div>
              <label className="text-sm font-medium">Password</label>
              <input name="password" type="password" required className="mt-1 block w-full rounded-md border px-4 py-2" />
            </div>
          )}
          {type === 'signup' && (
            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <input name="confirmPassword" type="password" required className="mt-1 block w-full rounded-md border px-4 py-2" />
            </div>
          )}
          {type === 'forgot-password' && (
            <div>
              <label className="text-sm font-medium">Email</label>
              <input name="email" type="email" required className="mt-1 block w-full rounded-md border px-4 py-2" />
            </div>
          )}
          <button type="submit" className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {type === 'login' && 'Sign in'}
            {type === 'signup' && 'Create account'}
            {type === 'forgot-password' && 'Send reset link'}
            {type === 'reset-password' && 'Reset password'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          {type === 'login' && (
            <>
              <a href="/forgot-password" className="text-muted-foreground hover:underline">Forgot password?</a>
              <span className="mx-2 text-muted-foreground">·</span>
              <a href="/signup" className="font-medium hover:underline">Create account</a>
            </>
          )}
          {type === 'signup' && (
            <span className="text-muted-foreground">
              Already have an account? <a href="/login" className="font-medium hover:underline">Sign in</a>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export const Auth = { Centered: AuthCentered }
