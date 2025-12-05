import type { Meta, StoryObj } from '@storybook/react'
import { Switch, Label } from '@mdxui/shadcn'
import { useState } from 'react'

const meta: Meta<typeof Switch> = {
  title: 'Components/Forms/Switch',
  component: Switch,
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
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
}

export const Checked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="checked" defaultChecked />
      <Label htmlFor="checked">Enabled by default</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch id="disabled-off" disabled />
        <Label htmlFor="disabled-off" className="text-muted-foreground">
          Disabled (off)
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-on" disabled defaultChecked />
        <Label htmlFor="disabled-on" className="text-muted-foreground">
          Disabled (on)
        </Label>
      </div>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(false)
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="interactive"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="interactive">
            {enabled ? 'Enabled' : 'Disabled'}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Current state: {enabled ? 'ON' : 'OFF'}
        </p>
      </div>
    )
  },
}

export const WithDescription: Story = {
  render: () => (
    <div className="flex items-center justify-between w-[350px]">
      <div className="space-y-0.5">
        <Label htmlFor="marketing">Marketing emails</Label>
        <p className="text-sm text-muted-foreground">
          Receive emails about new products and features.
        </p>
      </div>
      <Switch id="marketing" />
    </div>
  ),
}

export const SettingsForm: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications.
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Email notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Push notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive push notifications
            </p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>SMS notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive SMS notifications
            </p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Weekly digest</Label>
            <p className="text-xs text-muted-foreground">
              Receive weekly summary emails
            </p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  ),
}

export const DarkModeToggle: Story = {
  render: () => {
    const [isDark, setIsDark] = useState(false)
    return (
      <div className="flex items-center space-x-2">
        <Label htmlFor="dark-mode" className="text-sm">
          {isDark ? '🌙' : '☀️'}
        </Label>
        <Switch
          id="dark-mode"
          checked={isDark}
          onCheckedChange={setIsDark}
        />
        <span className="text-sm">{isDark ? 'Dark' : 'Light'} mode</span>
      </div>
    )
  },
}
