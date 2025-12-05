import type { Meta, StoryObj } from '@storybook/react'
import { Waitlist, WaitlistForm } from '@mdxui/semantic'

const meta: Meta<typeof Waitlist> = {
  title: 'Semantic/Waitlist',
  component: Waitlist,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    background: {
      control: 'select',
      options: ['none', 'dots', 'grid', 'radial', 'gradient', 'waves', 'aurora'],
    },
    formVariant: {
      control: 'select',
      options: ['default', 'inline'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Waitlist>

export const Default: Story = {
  args: {
    eyebrow: 'Coming Soon',
    headline: 'Build faster with semantic HTML',
    description: 'A pure CSS framework that styles semantic HTML structure. No classes needed.',
    placeholder: 'Enter your email',
    buttonText: 'Join waitlist',
    formVariant: 'inline',
    background: 'radial',
    onSuccess: (email) => alert(`Success! ${email} added to waitlist`),
    onError: (error) => alert(`Error: ${error}`),
  },
}

export const WithDotsBackground: Story = {
  args: {
    ...Default.args,
    background: 'dots',
  },
}

export const WithGridBackground: Story = {
  args: {
    ...Default.args,
    background: 'grid',
  },
}

export const WithGradientBackground: Story = {
  args: {
    ...Default.args,
    background: 'gradient',
  },
}

export const WithAuroraBackground: Story = {
  args: {
    ...Default.args,
    background: 'aurora',
  },
}

export const StackedForm: Story = {
  args: {
    ...Default.args,
    formVariant: 'default',
    background: 'none',
  },
}

export const MinimalNoBackground: Story = {
  args: {
    headline: 'Join the waitlist',
    description: 'Be the first to know when we launch.',
    formVariant: 'inline',
    background: 'none',
  },
}

// Standalone form story
export const FormOnly: StoryObj<typeof WaitlistForm> = {
  render: (args) => (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      <WaitlistForm {...args} />
    </div>
  ),
  args: {
    placeholder: 'your@email.com',
    buttonText: 'Subscribe',
    variant: 'inline',
    onSuccess: (email) => alert(`Subscribed: ${email}`),
  },
}
