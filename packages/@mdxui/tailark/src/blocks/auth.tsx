/**
 * Tailark Auth Blocks
 */

import * as React from 'react'
import type { TailarkAuthProps } from '../types'

const socialIcons = {
  google: <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  github: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
  apple: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>,
  twitter: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>,
  microsoft: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/></svg>,
}

const defaultTitles = {
  login: 'Welcome back',
  signup: 'Create your account',
  'forgot-password': 'Reset your password',
  'reset-password': 'Set new password',
  'verify-email': 'Verify your email',
}

export function AuthCentered({ type, logo, title, description, socialProviders, onSubmit }: TailarkAuthProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    formData.forEach((v, k) => { data[k] = v.toString() })
    onSubmit?.(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {logo && <div className="mb-8 flex justify-center">{logo}</div>}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{title || defaultTitles[type]}</h1>
          {description && <p className="mt-2 text-muted-foreground">{description}</p>}
        </div>

        {socialProviders && socialProviders.length > 0 && (
          <div className="mt-8 space-y-3">
            {socialProviders.map((provider) => (
              <button key={provider} className="flex w-full items-center justify-center gap-3 rounded-lg border py-3 text-sm font-medium hover:bg-accent">
                {socialIcons[provider]}
                Continue with {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </button>
            ))}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {(type === 'login' || type === 'signup' || type === 'forgot-password') && (
            <div>
              <label className="text-sm font-medium">Email</label>
              <input name="email" type="email" required className="mt-1 block w-full rounded-lg border px-4 py-2.5" />
            </div>
          )}
          {(type === 'login' || type === 'signup' || type === 'reset-password') && (
            <div>
              <label className="text-sm font-medium">Password</label>
              <input name="password" type="password" required className="mt-1 block w-full rounded-lg border px-4 py-2.5" />
            </div>
          )}
          {type === 'signup' && (
            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <input name="confirmPassword" type="password" required className="mt-1 block w-full rounded-lg border px-4 py-2.5" />
            </div>
          )}
          <button type="submit" className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {type === 'login' && 'Sign in'}
            {type === 'signup' && 'Create account'}
            {type === 'forgot-password' && 'Send reset link'}
            {type === 'reset-password' && 'Reset password'}
            {type === 'verify-email' && 'Verify email'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {type === 'login' && <><a href="/forgot-password" className="hover:underline">Forgot password?</a> · <a href="/signup" className="font-medium text-foreground hover:underline">Create account</a></>}
          {type === 'signup' && <>Already have an account? <a href="/login" className="font-medium text-foreground hover:underline">Sign in</a></>}
        </div>
      </div>
    </div>
  )
}

export const Auth = { Centered: AuthCentered }
