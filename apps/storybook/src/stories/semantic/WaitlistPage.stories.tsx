import type { Meta, StoryObj } from '@storybook/react'
import { WaitlistPage, WaitlistNavbar, Highlight } from '@mdxui/html'

const meta: Meta<typeof WaitlistPage> = {
  title: 'Blocks/WaitlistPage',
  component: WaitlistPage,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['auto', 'light', 'dark'],
    },
  },
}

export default meta
type Story = StoryObj<typeof WaitlistPage>

const defaultWaitlist = {
  eyebrow: 'Coming Soon',
  headline: 'Build faster with semantic HTML',
  description: 'A pure CSS framework that styles semantic HTML structure. No classes needed.',
  placeholder: 'Enter your email',
  buttonText: 'Join waitlist',
  formVariant: 'inline' as const,
  background: 'radial' as const,
  onSuccess: (email: string) => alert(`Success! ${email} added`),
}

export const Default: Story = {
  args: {
    waitlist: defaultWaitlist,
  },
}

export const WithNavbar: Story = {
  args: {
    navbar: <WaitlistNavbar brandText="Semantic UI" homeHref="/" />,
    waitlist: defaultWaitlist,
  },
}

export const WithNavbarAndLogo: Story = {
  args: {
    navbar: (
      <WaitlistNavbar homeHref="/">
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>S</span>
        <span style={{ marginLeft: '0.5rem' }}>Semantic</span>
      </WaitlistNavbar>
    ),
    waitlist: defaultWaitlist,
  },
}

export const WithFooter: Story = {
  args: {
    waitlist: defaultWaitlist,
    footer: (
      <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
        <small>&copy; 2024 Semantic UI. All rights reserved.</small>
      </div>
    ),
  },
}

export const WithHighlights: Story = {
  args: {
    navbar: <WaitlistNavbar brandText="Semantic UI" />,
    waitlist: {
      ...defaultWaitlist,
      background: 'aurora' as const,
    },
    children: (
      <Highlight
        items={[
          { icon: '🎯', title: 'No Classes', description: 'Style using pure HTML structure' },
          { icon: '♿', title: 'Accessible', description: 'Built-in accessibility by default' },
          { icon: '⚡', title: 'Fast', description: 'Zero runtime CSS-in-JS overhead' },
        ]}
      />
    ),
    footer: (
      <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
        <small>&copy; 2024 Semantic UI</small>
      </div>
    ),
  },
}

export const FullPage: Story = {
  args: {
    navbar: <WaitlistNavbar brandText="Semantic UI" homeHref="/" />,
    waitlist: {
      eyebrow: 'Early Access',
      headline: 'The future of web development',
      description: 'Pure semantic HTML with zero classes. Style with structure, not strings.',
      placeholder: 'your@email.com',
      buttonText: 'Get Early Access',
      formVariant: 'inline' as const,
      background: 'aurora' as const,
      onSuccess: (email: string) => alert(`Welcome ${email}!`),
    },
    children: (
      <Highlight
        items={[
          { icon: '🎯', title: 'No Classes Needed', description: 'Style using HTML structure. body > aside is the sidebar. main > aside is the TOC.' },
          { icon: '♿', title: 'Accessible by Default', description: 'Semantic elements provide built-in accessibility. Screen readers understand the structure.' },
          { icon: '🎨', title: 'Fully Themeable', description: 'Same HTML, different CSS = different theme. Just swap the stylesheet.' },
          { icon: '⚡', title: 'Lightning Fast', description: 'No runtime CSS-in-JS. Pure CSS with custom properties for optimal performance.' },
        ]}
      />
    ),
    footer: (
      <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
        <p><small>&copy; 2024 Semantic UI. Built with pure HTML &amp; CSS.</small></p>
        <p style={{ marginTop: '0.5rem' }}>
          <a href="#" style={{ opacity: 0.8 }}>Twitter</a>
          {' · '}
          <a href="#" style={{ opacity: 0.8 }}>GitHub</a>
          {' · '}
          <a href="#" style={{ opacity: 0.8 }}>Discord</a>
        </p>
      </div>
    ),
  },
}

export const DarkTheme: Story = {
  args: {
    theme: 'dark',
    navbar: <WaitlistNavbar brandText="Semantic UI" />,
    waitlist: {
      ...defaultWaitlist,
      background: 'dots' as const,
    },
  },
}

export const LightTheme: Story = {
  args: {
    theme: 'light',
    navbar: <WaitlistNavbar brandText="Semantic UI" />,
    waitlist: {
      ...defaultWaitlist,
      background: 'grid' as const,
    },
  },
}
