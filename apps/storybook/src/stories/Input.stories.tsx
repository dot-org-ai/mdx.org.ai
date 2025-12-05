import type { Meta, StoryObj } from '@storybook/react'
import { Input, Label } from '@mdxui/shadcn'

const meta: Meta<typeof Input> = {
  title: 'shadcn/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
  render: (args) => <Input {...args} className="w-[300px]" />,
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Email',
  },
  render: (args) => <Input {...args} className="w-[300px]" />,
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Password',
  },
  render: (args) => <Input {...args} className="w-[300px]" />,
}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: 'Disabled',
    disabled: true,
  },
  render: (args) => <Input {...args} className="w-[300px]" />,
}

export const File: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="picture">Picture</Label>
      <Input id="picture" type="file" />
    </div>
  ),
}
