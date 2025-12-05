import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox, Label } from '@mdxui/shadcn'
import { useState } from 'react'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Forms/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
}

export const Checked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="checked" defaultChecked />
      <Label htmlFor="checked">This is checked by default</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled" disabled />
        <Label htmlFor="disabled" className="text-muted-foreground">
          Disabled unchecked
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked" className="text-muted-foreground">
          Disabled checked
        </Label>
      </div>
    </div>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <div className="items-top flex space-x-2">
      <Checkbox id="terms1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="terms1">Accept terms and conditions</Label>
        <p className="text-sm text-muted-foreground">
          You agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  ),
}

export const CheckboxGroup: Story = {
  render: () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Select your interests:</h4>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="tech" />
          <Label htmlFor="tech">Technology</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="design" />
          <Label htmlFor="design">Design</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="business" />
          <Label htmlFor="business">Business</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="science" />
          <Label htmlFor="science">Science</Label>
        </div>
      </div>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="interactive"
            checked={checked}
            onCheckedChange={(value) => setChecked(value as boolean)}
          />
          <Label htmlFor="interactive">
            {checked ? 'Checked' : 'Unchecked'}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Current state: {checked ? 'true' : 'false'}
        </p>
      </div>
    )
  },
}

export const IndeterminateExample: Story = {
  render: () => {
    const [checked, setChecked] = useState<boolean | 'indeterminate'>('indeterminate')
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="indeterminate"
            checked={checked}
            onCheckedChange={(value) => setChecked(value as boolean)}
          />
          <Label htmlFor="indeterminate">Select all items</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Click to cycle through: unchecked → checked → indeterminate
        </p>
      </div>
    )
  },
}

export const FormExample: Story = {
  render: () => (
    <form className="space-y-4 w-[300px]">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Notifications</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="email-notif" defaultChecked />
            <Label htmlFor="email-notif">Email notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="push-notif" />
            <Label htmlFor="push-notif">Push notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="sms-notif" />
            <Label htmlFor="sms-notif">SMS notifications</Label>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="marketing" />
        <Label htmlFor="marketing" className="text-sm">
          Receive marketing emails
        </Label>
      </div>
    </form>
  ),
}
