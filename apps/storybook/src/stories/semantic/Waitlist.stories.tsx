import type { Meta, StoryObj } from '@storybook/react'
import { Waitlist, WaitlistForm, WaitlistPage, WaitlistNavbar, Highlight, Bento } from '@mdxui/html'

const meta: Meta<typeof Waitlist> = {
  title: 'Blocks/Waitlist',
  component: Waitlist,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    background: {
      control: 'select',
      options: ['none', 'dots', 'grid', 'grid-fade', 'radial', 'radial-top', 'gradient', 'gradient-radial', 'waves', 'aurora', 'spotlight', 'animated-gradient', 'noise', 'glass', 'striped'],
    },
    formVariant: {
      control: 'select',
      options: ['default', 'inline'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Waitlist>

const baseArgs = {
  eyebrow: 'Coming Soon',
  headline: 'Build faster with semantic HTML',
  description: 'A pure CSS framework that styles semantic HTML structure. No classes needed.',
  placeholder: 'Enter your email',
  buttonText: 'Join waitlist',
  formVariant: 'inline' as const,
  onSuccess: (email: string) => alert(`Success! ${email} added to waitlist`),
  onError: (error: string) => alert(`Error: ${error}`),
}

export const Default: Story = {
  args: {
    ...baseArgs,
    background: 'radial',
  },
}

// Background Variants
export const BackgroundDots: Story = {
  args: { ...baseArgs, background: 'dots' },
}

export const BackgroundGrid: Story = {
  args: { ...baseArgs, background: 'grid' },
}

export const BackgroundGridFade: Story = {
  args: { ...baseArgs, background: 'grid-fade' },
}

export const BackgroundRadial: Story = {
  args: { ...baseArgs, background: 'radial' },
}

export const BackgroundRadialTop: Story = {
  args: { ...baseArgs, background: 'radial-top' },
}

export const BackgroundGradient: Story = {
  args: { ...baseArgs, background: 'gradient' },
}

export const BackgroundGradientRadial: Story = {
  args: { ...baseArgs, background: 'gradient-radial' },
}

export const BackgroundWaves: Story = {
  args: { ...baseArgs, background: 'waves' },
}

export const BackgroundAurora: Story = {
  args: { ...baseArgs, background: 'aurora' },
}

export const BackgroundSpotlight: Story = {
  args: { ...baseArgs, background: 'spotlight' },
}

export const BackgroundAnimatedGradient: Story = {
  args: { ...baseArgs, background: 'animated-gradient' },
}

export const BackgroundNoise: Story = {
  args: { ...baseArgs, background: 'noise' },
}

export const BackgroundGlass: Story = {
  args: { ...baseArgs, background: 'glass' },
}

export const BackgroundStriped: Story = {
  args: { ...baseArgs, background: 'striped' },
}

export const BackgroundNone: Story = {
  args: { ...baseArgs, background: 'none' },
}

// Form Variants
export const StackedForm: Story = {
  args: {
    ...baseArgs,
    formVariant: 'default',
    background: 'none',
  },
}

export const InlineForm: Story = {
  args: {
    ...baseArgs,
    formVariant: 'inline',
    background: 'radial',
  },
}

// Content Variants
export const MinimalHeadlineOnly: Story = {
  args: {
    headline: 'Join the waitlist',
    formVariant: 'inline',
    background: 'none',
  },
}

export const WithDescription: Story = {
  args: {
    headline: 'Join the waitlist',
    description: 'Be the first to know when we launch.',
    formVariant: 'inline',
    background: 'radial',
  },
}

export const FullContent: Story = {
  args: {
    eyebrow: 'Early Access',
    headline: 'The future of web development',
    description: 'Pure semantic HTML with zero classes. Style with structure, not strings.',
    placeholder: 'your@email.com',
    buttonText: 'Get Early Access',
    formVariant: 'inline',
    background: 'aurora',
  },
}
