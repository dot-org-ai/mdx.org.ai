import type { Meta, StoryObj } from '@storybook/react'
import { WaitlistForm } from '@mdxui/html'

const meta: Meta<typeof WaitlistForm> = {
  title: 'Blocks/WaitlistForm',
  component: WaitlistForm,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'inline'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', maxWidth: '500px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof WaitlistForm>

export const Default: Story = {
  args: {
    placeholder: 'Enter your email',
    buttonText: 'Join waitlist',
    variant: 'default',
    onSuccess: (email) => alert(`Success! ${email} added to waitlist`),
    onError: (error) => alert(`Error: ${error}`),
  },
}

export const Inline: Story = {
  args: {
    placeholder: 'Enter your email',
    buttonText: 'Join waitlist',
    variant: 'inline',
    onSuccess: (email) => alert(`Subscribed: ${email}`),
  },
}

export const Subscribe: Story = {
  args: {
    placeholder: 'your@email.com',
    buttonText: 'Subscribe',
    variant: 'inline',
    onSuccess: (email) => alert(`Subscribed: ${email}`),
  },
}

export const GetStarted: Story = {
  args: {
    placeholder: 'Enter email to get started',
    buttonText: 'Get Started',
    variant: 'default',
    onSuccess: (email) => alert(`Welcome: ${email}`),
  },
}

export const Notify: Story = {
  args: {
    placeholder: 'Email for notifications',
    buttonText: 'Notify Me',
    variant: 'inline',
    onSuccess: (email) => alert(`You'll be notified: ${email}`),
  },
}

export const WithCustomAction: Story = {
  args: {
    placeholder: 'your@email.com',
    buttonText: 'Sign Up',
    variant: 'inline',
    action: '/api/newsletter',
    source: 'storybook',
    onSuccess: (email) => alert(`Signed up: ${email}`),
    onError: (error) => alert(`Error: ${error}`),
  },
}
