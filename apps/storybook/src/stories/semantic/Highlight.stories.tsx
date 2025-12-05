import type { Meta, StoryObj } from '@storybook/react'
import { Highlight } from '@mdxui/html'

const meta: Meta<typeof Highlight> = {
  title: 'Blocks/Highlight',
  component: Highlight,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Highlight>

export const ThreeItems: Story = {
  args: {
    items: [
      { icon: '🎯', title: 'No Classes Needed', description: 'Style using HTML structure. body > aside is the sidebar.' },
      { icon: '♿', title: 'Accessible by Default', description: 'Semantic elements provide built-in accessibility.' },
      { icon: '⚡', title: 'Lightning Fast', description: 'No runtime CSS-in-JS overhead.' },
    ],
  },
}

export const FourItems: Story = {
  args: {
    items: [
      { icon: '🎯', title: 'No Classes', description: 'Style using pure HTML structure' },
      { icon: '♿', title: 'Accessible', description: 'Built-in accessibility by default' },
      { icon: '⚡', title: 'Fast', description: 'Zero runtime CSS-in-JS overhead' },
      { icon: '🎨', title: 'Themeable', description: 'Same HTML, different CSS = different theme' },
    ],
  },
}

export const SixItems: Story = {
  args: {
    items: [
      { icon: '🎯', title: 'No Classes', description: 'Style using pure HTML structure' },
      { icon: '♿', title: 'Accessible', description: 'Built-in accessibility by default' },
      { icon: '⚡', title: 'Fast', description: 'Zero runtime overhead' },
      { icon: '🎨', title: 'Themeable', description: 'Swap stylesheets for new themes' },
      { icon: '📱', title: 'Responsive', description: 'Mobile-first responsive design' },
      { icon: '🌙', title: 'Dark Mode', description: 'Automatic dark mode support' },
    ],
  },
}

export const WithoutIcons: Story = {
  args: {
    items: [
      { title: 'Semantic HTML', description: 'Use meaningful elements instead of divs with classes.' },
      { title: 'CSS Selectors', description: 'Style elements based on their position in the DOM.' },
      { title: 'Custom Properties', description: 'Use CSS variables for easy theming and customization.' },
    ],
  },
}

export const ProductFeatures: Story = {
  args: {
    items: [
      { icon: '🚀', title: 'Fast Performance', description: 'Pure CSS means no runtime overhead. Your pages load instantly.' },
      { icon: '🔧', title: 'Easy Maintenance', description: 'HTML structure is self-documenting. No class naming debates.' },
      { icon: '🌐', title: 'Universal Compatibility', description: 'Works with any framework or none at all.' },
    ],
  },
}

export const TechStack: Story = {
  args: {
    items: [
      { icon: '⚛️', title: 'React', description: 'First-class React components with TypeScript support.' },
      { icon: '🎨', title: 'CSS', description: 'Pure CSS with no build-time processing required.' },
      { icon: '📦', title: 'Zero Dependencies', description: 'No external runtime dependencies to worry about.' },
    ],
  },
}
