import type { Meta, StoryObj } from '@storybook/react'
import { Spinner, Button } from '@mdxui/shadcn'
import { useState } from 'react'

const meta: Meta<typeof Spinner> = {
  title: 'Components/Feedback/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Spinner />,
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <Spinner className="h-4 w-4" />
        <p className="text-xs mt-2">Small</p>
      </div>
      <div className="text-center">
        <Spinner className="h-6 w-6" />
        <p className="text-xs mt-2">Medium</p>
      </div>
      <div className="text-center">
        <Spinner className="h-8 w-8" />
        <p className="text-xs mt-2">Large</p>
      </div>
      <div className="text-center">
        <Spinner className="h-12 w-12" />
        <p className="text-xs mt-2">XL</p>
      </div>
    </div>
  ),
}

export const WithText: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Spinner className="h-4 w-4" />
      <span className="text-sm">Loading...</span>
    </div>
  ),
}

export const InButton: Story = {
  render: () => {
    const [loading, setLoading] = useState(false)

    const handleClick = () => {
      setLoading(true)
      setTimeout(() => setLoading(false), 2000)
    }

    return (
      <Button onClick={handleClick} disabled={loading}>
        {loading && <Spinner className="h-4 w-4 mr-2" />}
        {loading ? 'Loading...' : 'Click to load'}
      </Button>
    )
  },
}

export const FullPage: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center w-[300px] h-[200px] border rounded-lg">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground mt-4">Loading content...</p>
    </div>
  ),
}

export const Overlay: Story = {
  render: () => (
    <div className="relative w-[300px] h-[200px] border rounded-lg p-4">
      <p className="text-sm">Some content here that will be covered by the loading overlay.</p>
      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-sm mt-2">Please wait...</p>
        </div>
      </div>
    </div>
  ),
}

export const CardLoading: Story = {
  render: () => (
    <div className="w-[300px] border rounded-lg">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Card Title</h3>
      </div>
      <div className="flex items-center justify-center h-[150px]">
        <Spinner className="h-6 w-6" />
      </div>
    </div>
  ),
}

export const InlineLoading: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">Checking status</span>
        <Spinner className="h-4 w-4" />
      </div>
      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">Saving changes</span>
        <Spinner className="h-4 w-4" />
      </div>
      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm text-green-600">Completed</span>
        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  ),
}
