import type { Meta, StoryObj } from '@storybook/react'
import { Features } from '@mdxui/semantic'

const meta: Meta<typeof Features> = {
  title: 'Semantic/Sections/Features',
  component: Features,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Features>

const sampleFeatures = [
  {
    icon: '🎯',
    title: 'No Classes Needed',
    description: 'Style using HTML structure. body > aside is the sidebar. main > aside is the TOC.',
  },
  {
    icon: '♿',
    title: 'Accessible by Default',
    description: 'Semantic elements provide built-in accessibility. Screen readers understand the structure.',
  },
  {
    icon: '🎨',
    title: 'Fully Themeable',
    description: 'Same HTML, different CSS = different theme. Just swap the stylesheet.',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'No runtime CSS-in-JS. Pure CSS with custom properties for optimal performance.',
  },
  {
    icon: '📱',
    title: 'Responsive',
    description: 'Mobile-first responsive design built into every component.',
  },
  {
    icon: '🌙',
    title: 'Dark Mode',
    description: 'Automatic dark mode support with prefers-color-scheme.',
  },
]

export const Default: Story = {
  args: {
    headline: 'Why Semantic HTML?',
    description: 'Build accessible, maintainable websites with pure HTML structure',
    features: sampleFeatures.slice(0, 3),
  },
}

export const SixFeatures: Story = {
  args: {
    headline: 'Everything You Need',
    description: 'A complete solution for modern web development',
    features: sampleFeatures,
  },
}

export const WithCards: Story = {
  args: {
    headline: 'Features',
    features: sampleFeatures.slice(0, 3),
    style: 'cards',
  },
}

export const NoHeader: Story = {
  args: {
    features: sampleFeatures.slice(0, 4),
  },
}

// Raw HTML version showing the semantic structure
export const RawHTML: Story = {
  render: () => (
    <section aria-label="Features">
      <header>
        <h2>Built with Semantic HTML</h2>
        <p>No classes, just pure structure</p>
      </header>
      <div>
        <article>
          <div>🚀</div>
          <h3>Fast Performance</h3>
          <p>Pure CSS means no runtime overhead.</p>
        </article>
        <article>
          <div>🔧</div>
          <h3>Easy Maintenance</h3>
          <p>HTML structure is self-documenting.</p>
        </article>
        <article>
          <div>🌐</div>
          <h3>Universal Compatibility</h3>
          <p>Works with any framework or none at all.</p>
        </article>
      </div>
    </section>
  ),
}
