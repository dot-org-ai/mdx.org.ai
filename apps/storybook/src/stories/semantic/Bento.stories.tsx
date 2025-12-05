import type { Meta, StoryObj } from '@storybook/react'
import { Bento } from '@mdxui/html'

const meta: Meta<typeof Bento> = {
  title: 'Blocks/Bento',
  component: Bento,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Bento>

export const Default: Story = {
  args: {
    headline: 'Everything you need',
    description: 'A complete toolkit for building modern web applications.',
    items: [
      { title: 'Components', description: 'Pre-built semantic HTML components ready to use.' },
      { title: 'Layouts', description: 'Flexible layout systems for any design.' },
      { title: 'Themes', description: 'Beautiful themes with dark mode support.' },
      { title: 'Utilities', description: 'Helper functions and CSS utilities.' },
    ],
  },
}

export const WithSpans: Story = {
  args: {
    headline: 'Feature Overview',
    description: 'Discover what makes our framework different.',
    items: [
      { title: 'Pure Semantic HTML', description: 'No classes needed. Style elements based on their meaning and structure.', span: 'double' },
      { title: 'Fast', description: 'Zero runtime overhead.' },
      { title: 'Accessible', description: 'Built-in a11y.' },
      { title: 'CSS Custom Properties', description: 'Easy theming with CSS variables. Change colors, spacing, and typography globally.', span: 'double' },
    ],
  },
}

export const WithLinks: Story = {
  args: {
    headline: 'Resources',
    description: 'Get started with these helpful resources.',
    items: [
      { title: 'Documentation', description: 'Learn how to use all components.', href: '#docs' },
      { title: 'Examples', description: 'See real-world implementations.', href: '#examples' },
      { title: 'GitHub', description: 'View source and contribute.', href: '#github' },
      { title: 'Discord', description: 'Join our community.', href: '#discord' },
    ],
  },
}

export const WithContent: Story = {
  args: {
    headline: 'Code Examples',
    items: [
      {
        title: 'Simple Structure',
        description: 'Just write semantic HTML.',
        content: (
          <pre style={{ fontSize: '0.75rem', padding: '1rem', background: 'var(--muted)', borderRadius: '0.5rem', overflow: 'auto' }}>
{`<section aria-label="Hero">
  <h1>Welcome</h1>
  <p>Description</p>
</section>`}
          </pre>
        ),
        span: 'double',
      },
      { title: 'No Classes', description: 'Styling based on structure.' },
      { title: 'Pure CSS', description: 'No JavaScript runtime.' },
    ],
  },
}

export const NoHeader: Story = {
  args: {
    items: [
      { title: 'Component A', description: 'Description for component A.' },
      { title: 'Component B', description: 'Description for component B.' },
      { title: 'Component C', description: 'Description for component C.' },
    ],
  },
}

export const ProductShowcase: Story = {
  args: {
    headline: 'Built for developers',
    description: 'Everything you need to build beautiful, accessible websites.',
    items: [
      { title: 'TypeScript First', description: 'Full TypeScript support with comprehensive types for all components.', span: 'double' },
      { title: 'Tree Shakeable', description: 'Import only what you need.' },
      { title: 'SSR Ready', description: 'Works with Next.js, Remix, etc.' },
      { title: 'Accessible', description: 'WCAG 2.1 compliant out of the box.' },
      { title: 'Themeable', description: 'CSS custom properties for easy theming.' },
      { title: 'Framework Agnostic CSS', description: 'The CSS works with any framework. React components are optional.', span: 'double' },
    ],
  },
}
