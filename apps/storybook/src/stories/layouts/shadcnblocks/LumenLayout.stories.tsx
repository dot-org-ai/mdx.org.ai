import type { Meta, StoryObj } from '@storybook/react'
import { LumenLayout } from '@mdxui/shadcnblocks/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleFooter,
} from '../../../data/sample-data'
import * as React from 'react'

const meta: Meta<typeof LumenLayout> = {
  title: 'Layouts/Shadcnblocks/LumenLayout',
  component: LumenLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Lumen Layout

A modern, minimal layout with content-first design. Features flexible content blocks and clean typography.

### Design Philosophy
- Content takes center stage
- Clean, generous whitespace
- Flexible block-based sections
- Optimized for readability
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof LumenLayout>

export const Default: Story = {
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      title: 'Beautiful, minimal design',
      subtitle: 'A content-first approach to modern web pages.',
    },
    blocks: [
      {
        type: 'text',
        content: (
          <div>
            <h2>Why choose Lumen?</h2>
            <p>
              Lumen is designed for those who appreciate simplicity. Every element has a purpose,
              and every pixel serves the content.
            </p>
          </div>
        ),
      },
      {
        type: 'feature',
        content: (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            <div>
              <h3>Minimal</h3>
              <p>No clutter. Just what matters.</p>
            </div>
            <div>
              <h3>Flexible</h3>
              <p>Build with blocks that adapt.</p>
            </div>
          </div>
        ),
      },
    ],
    footer: {
      brand: sampleBrand,
      links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy', href: '/privacy' },
      ],
      copyright: '© 2024 Acme Inc.',
    },
  },
}

export const BlogPost: Story = {
  name: 'Blog Post Layout',
  args: {
    header: {
      brand: { name: 'The Blog', href: '/' },
      navigation: [
        { label: 'Articles', href: '/articles' },
        { label: 'About', href: '/about' },
      ],
    },
    hero: {
      title: 'The Art of Simplicity',
      subtitle: 'December 5, 2024 · 5 min read',
    },
    blocks: [
      {
        type: 'text',
        content: (
          <article style={{ maxWidth: '65ch', margin: '0 auto', lineHeight: 1.8 }}>
            <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)' }}>
              In a world of complexity, simplicity is a superpower. This is the story of how we
              learned to do more with less.
            </p>
            <h2>The Beginning</h2>
            <p>
              It started with a simple question: what if we removed everything that wasn&apos;t
              essential? What would be left?
            </p>
            <p>
              The answer surprised us. By stripping away the unnecessary, we found clarity. Each
              remaining element had purpose. Each interaction felt intentional.
            </p>
            <h2>The Process</h2>
            <p>
              We began by listing everything on the page. Then, one by one, we asked: does this
              serve the user? If the answer was no, it went away.
            </p>
            <blockquote style={{ borderLeft: '4px solid var(--primary)', paddingLeft: '1rem', fontStyle: 'italic' }}>
              &quot;Perfection is achieved not when there is nothing more to add, but when there is nothing
              left to take away.&quot; — Antoine de Saint-Exupéry
            </blockquote>
            <h2>The Result</h2>
            <p>
              What emerged was something beautiful in its restraint. A design that breathed.
              Content that commanded attention. An experience that felt effortless.
            </p>
          </article>
        ),
      },
    ],
    footer: {
      brand: { name: 'The Blog' },
      links: [{ label: 'RSS', href: '/rss' }],
      copyright: '© 2024',
    },
  },
}

export const Portfolio: Story = {
  name: 'Portfolio Layout',
  args: {
    header: {
      brand: { name: 'Jane Designer', href: '/' },
      navigation: [
        { label: 'Work', href: '/work' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    hero: {
      title: 'Jane Designer',
      subtitle: 'Product Designer crafting digital experiences',
    },
    blocks: [
      {
        type: 'feature',
        content: (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '4/3',
                  background: 'var(--muted)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: 'var(--muted-foreground)' }}>Project {i}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        type: 'text',
        content: (
          <div style={{ textAlign: 'center', maxWidth: '50ch', margin: '0 auto' }}>
            <h2>Let&apos;s work together</h2>
            <p>Have a project in mind? I&apos;d love to hear about it.</p>
            <a
              href="/contact"
              style={{
                display: 'inline-block',
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                borderRadius: '0.375rem',
                textDecoration: 'none',
              }}
            >
              Get in Touch
            </a>
          </div>
        ),
      },
    ],
    footer: {
      brand: { name: 'Jane Designer' },
      links: [
        { label: 'Twitter', href: '#' },
        { label: 'Dribbble', href: '#' },
        { label: 'LinkedIn', href: '#' },
      ],
      copyright: '© 2024 Jane Designer',
    },
  },
}

export const Documentation: Story = {
  name: 'Documentation Page',
  args: {
    header: {
      brand: { name: 'Docs', href: '/' },
      navigation: [
        { label: 'Getting Started', href: '/docs/getting-started' },
        { label: 'API', href: '/docs/api' },
        { label: 'Examples', href: '/docs/examples' },
      ],
      actions: [{ label: 'GitHub', href: 'https://github.com', variant: 'ghost' }],
    },
    hero: {
      title: 'Getting Started',
      subtitle: 'Learn how to set up your project in minutes.',
    },
    blocks: [
      {
        type: 'text',
        content: (
          <div style={{ maxWidth: '65ch', margin: '0 auto' }}>
            <h2>Installation</h2>
            <pre
              style={{
                background: 'var(--muted)',
                padding: '1rem',
                borderRadius: '0.5rem',
                overflow: 'auto',
              }}
            >
              <code>npm install @acme/sdk</code>
            </pre>

            <h2>Quick Start</h2>
            <p>Import and initialize the client:</p>
            <pre
              style={{
                background: 'var(--muted)',
                padding: '1rem',
                borderRadius: '0.5rem',
                overflow: 'auto',
              }}
            >
              <code>{`import { Client } from '@acme/sdk'

const client = new Client({
  apiKey: process.env.API_KEY
})

const result = await client.query('Hello!')`}</code>
            </pre>

            <h2>Next Steps</h2>
            <ul>
              <li>
                <a href="/docs/api">API Reference</a> - Full API documentation
              </li>
              <li>
                <a href="/docs/examples">Examples</a> - Real-world usage examples
              </li>
              <li>
                <a href="/docs/best-practices">Best Practices</a> - Tips for production
              </li>
            </ul>
          </div>
        ),
      },
    ],
    footer: {
      brand: { name: 'Acme SDK' },
      links: [{ label: 'GitHub', href: '#' }],
      copyright: '© 2024 Acme Inc.',
    },
  },
}
