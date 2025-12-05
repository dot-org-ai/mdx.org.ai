import type { Meta, StoryObj } from '@storybook/react'
import { Alert, AlertDescription, AlertTitle } from '@mdxui/shadcn'
import { AlertCircle, CheckCircle2, Info as InfoIcon, AlertTriangle, Terminal } from 'lucide-react'

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert className="w-[400px]">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-[400px]">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
}

export const Success: Story = {
  render: () => (
    <Alert className="w-[400px] border-green-500 text-green-700 dark:text-green-400">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <AlertTitle>Success!</AlertTitle>
      <AlertDescription>
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
}

export const Warning: Story = {
  render: () => (
    <Alert className="w-[400px] border-yellow-500 text-yellow-700 dark:text-yellow-400">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        Your account is about to expire. Please renew your subscription.
      </AlertDescription>
    </Alert>
  ),
}

export const Info: Story = {
  render: () => (
    <Alert className="w-[400px] border-blue-500 text-blue-700 dark:text-blue-400">
      <InfoIcon className="h-4 w-4 text-blue-500" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        A new version of the app is available. Refresh to update.
      </AlertDescription>
    </Alert>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="w-[450px] space-y-4">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>This is the default alert style.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Destructive Alert</AlertTitle>
        <AlertDescription>This indicates an error or destructive action.</AlertDescription>
      </Alert>
      <Alert className="border-green-500 text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>Success Alert</AlertTitle>
        <AlertDescription>This indicates a successful operation.</AlertDescription>
      </Alert>
      <Alert className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertTitle>Warning Alert</AlertTitle>
        <AlertDescription>This indicates a warning or caution.</AlertDescription>
      </Alert>
    </div>
  ),
}

export const WithoutIcon: Story = {
  render: () => (
    <Alert className="w-[400px]">
      <AlertTitle>Note</AlertTitle>
      <AlertDescription>
        Alerts can be used without icons as well.
      </AlertDescription>
    </Alert>
  ),
}

export const DescriptionOnly: Story = {
  render: () => (
    <Alert className="w-[400px]">
      <InfoIcon className="h-4 w-4" />
      <AlertDescription>
        You can also use alerts with just a description, without a title.
      </AlertDescription>
    </Alert>
  ),
}
