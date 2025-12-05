import type { Meta, StoryObj } from '@storybook/react'
import { Hero } from '@mdxui/semantic'

const meta: Meta<typeof Hero> = {
  title: 'Semantic/Sections/Hero',
  component: Hero,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof Hero>

export const Default: Story = {
  args: {
    tagline: 'Introducing',
    headline: 'A beautiful hero section',
    description: 'Build stunning landing pages with pure semantic HTML. No classes, just structure.',
  },
  render: (args) => (
    <section aria-label="Hero" style={{ padding: '5rem 1rem' }}>
      {args.tagline && <small>{args.tagline}</small>}
      <h1>{args.headline}</h1>
      {args.description && <p>{args.description}</p>}
      <form>
        <input type="email" placeholder="Enter your email" />
        <button type="submit">Get Started</button>
      </form>
    </section>
  ),
}

export const WithoutTagline: Story = {
  args: {
    headline: 'Start building today',
    description: 'The fastest way to create semantic, accessible websites.',
  },
  render: (args) => (
    <section aria-label="Hero" style={{ padding: '5rem 1rem' }}>
      <h1>{args.headline}</h1>
      {args.description && <p>{args.description}</p>}
      <form>
        <input type="email" placeholder="Enter your email" />
        <button type="submit">Join Waitlist</button>
      </form>
    </section>
  ),
}

export const HeadlineOnly: Story = {
  args: {
    headline: 'Welcome to the future',
  },
  render: (args) => (
    <section aria-label="Hero" style={{ padding: '5rem 1rem' }}>
      <h1>{args.headline}</h1>
      <button>Learn More</button>
    </section>
  ),
}

export const WithMultipleButtons: Story = {
  args: {
    tagline: 'Now Available',
    headline: 'The complete design system',
    description: 'Everything you need to build modern web applications.',
  },
  render: (args) => (
    <section aria-label="Hero" style={{ padding: '5rem 1rem' }}>
      {args.tagline && <small>{args.tagline}</small>}
      <h1>{args.headline}</h1>
      {args.description && <p>{args.description}</p>}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button>Get Started</button>
        <button data-variant="outline">View Demo</button>
      </div>
    </section>
  ),
}
