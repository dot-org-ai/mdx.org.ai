import type { ReactNode } from 'react'

export type AuthPageType =
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'two-factor'

export interface AuthPageProps {
  type: AuthPageType
  logo?: ReactNode
  title?: string
  description?: string
  socialProviders?: Array<'google' | 'github' | 'apple' | 'microsoft'>
  showRememberMe?: boolean
  termsLink?: string
  privacyLink?: string
  onSubmit?: (data: Record<string, string>) => void
  variant?: 'centered' | 'split' | 'minimal'
}

const defaultContent: Record<
  AuthPageType,
  { title: string; description: string; submitLabel: string }
> = {
  login: {
    title: 'Sign in to your account',
    description: 'Welcome back! Please enter your details.',
    submitLabel: 'Sign in',
  },
  signup: {
    title: 'Create an account',
    description: 'Get started by creating your account.',
    submitLabel: 'Sign up',
  },
  'forgot-password': {
    title: 'Forgot your password?',
    description: "Enter your email and we'll send you a reset link.",
    submitLabel: 'Send reset link',
  },
  'reset-password': {
    title: 'Reset your password',
    description: 'Choose a new password for your account.',
    submitLabel: 'Reset password',
  },
  'verify-email': {
    title: 'Verify your email',
    description: 'Please enter the verification code we sent to your email.',
    submitLabel: 'Verify email',
  },
  'two-factor': {
    title: 'Two-factor authentication',
    description: 'Enter the code from your authenticator app.',
    submitLabel: 'Verify',
  },
}

const socialProviderLabels: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  microsoft: 'Microsoft',
}

export function AuthPage({
  type,
  logo,
  title,
  description,
  socialProviders,
  showRememberMe = false,
  termsLink,
  privacyLink,
  onSubmit,
  variant = 'centered',
}: AuthPageProps) {
  const content = defaultContent[type]
  const pageTitle = title || content.title
  const pageDescription = description || content.description

  return (
    <main aria-label="Authentication" data-variant={variant}>
      <article data-auth-type={type}>
        <header>
          {logo && <div data-logo="">{logo}</div>}
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
        </header>

        {socialProviders && socialProviders.length > 0 && (
          <div data-social-auth="">
            {socialProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                data-provider={provider}
                aria-label={`Sign in with ${socialProviderLabels[provider]}`}
              >
                <span data-provider-icon="">{socialProviderLabels[provider]}</span>
                Continue with {socialProviderLabels[provider]}
              </button>
            ))}
            <div data-divider="">
              <span>or</span>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (onSubmit) {
              const formData = new FormData(e.currentTarget)
              const data: Record<string, string> = {}
              formData.forEach((value, key) => {
                data[key] = value.toString()
              })
              onSubmit(data)
            }
          }}
        >
          {renderFormFields(type, showRememberMe)}

          <button type="submit" data-submit="">
            {content.submitLabel}
          </button>
        </form>

        <footer>
          {renderFooterContent(type, termsLink, privacyLink)}
        </footer>
      </article>
    </main>
  )
}

function renderFormFields(type: AuthPageType, showRememberMe: boolean): ReactNode {
  switch (type) {
    case 'login':
      return (
        <>
          <div data-field="">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div data-field="">
            <label htmlFor="password">
              Password
              <a href="/forgot-password" data-forgot-link="">
                Forgot password?
              </a>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          {showRememberMe && (
            <div data-field-checkbox="">
              <input id="remember" name="remember" type="checkbox" />
              <label htmlFor="remember">Remember me</label>
            </div>
          )}
        </>
      )

    case 'signup':
      return (
        <>
          <div data-field="">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="John Doe"
            />
          </div>

          <div data-field="">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div data-field="">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <div data-field="">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              minLength={8}
            />
          </div>
        </>
      )

    case 'forgot-password':
      return (
        <div data-field="">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
      )

    case 'reset-password':
      return (
        <>
          <div data-field="">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <div data-field="">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              minLength={8}
            />
          </div>
        </>
      )

    case 'verify-email':
      return (
        <div data-field="">
          <label htmlFor="code">Verification code</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            placeholder="000000"
            maxLength={6}
          />
        </div>
      )

    case 'two-factor':
      return (
        <div data-field="">
          <label htmlFor="code">Authentication code</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            placeholder="000000"
            maxLength={6}
          />
        </div>
      )

    default:
      return null
  }
}

function renderFooterContent(
  type: AuthPageType,
  termsLink?: string,
  privacyLink?: string
): ReactNode {
  switch (type) {
    case 'login':
      return (
        <p>
          Don't have an account?{' '}
          <a href="/signup" data-switch-link="">
            Sign up
          </a>
        </p>
      )

    case 'signup':
      return (
        <>
          {(termsLink || privacyLink) && (
            <p data-terms="">
              By signing up, you agree to our{' '}
              {termsLink && <a href={termsLink}>Terms of Service</a>}
              {termsLink && privacyLink && ' and '}
              {privacyLink && <a href={privacyLink}>Privacy Policy</a>}
            </p>
          )}
          <p>
            Already have an account?{' '}
            <a href="/login" data-switch-link="">
              Sign in
            </a>
          </p>
        </>
      )

    case 'forgot-password':
      return (
        <p>
          Remember your password?{' '}
          <a href="/login" data-switch-link="">
            Sign in
          </a>
        </p>
      )

    case 'reset-password':
      return (
        <p>
          <a href="/login" data-switch-link="">
            Back to sign in
          </a>
        </p>
      )

    case 'verify-email':
      return (
        <p>
          Didn't receive the code?{' '}
          <button type="button" data-resend-link="">
            Resend
          </button>
        </p>
      )

    case 'two-factor':
      return (
        <p>
          Having trouble?{' '}
          <a href="/help" data-help-link="">
            Get help
          </a>
        </p>
      )

    default:
      return null
  }
}
