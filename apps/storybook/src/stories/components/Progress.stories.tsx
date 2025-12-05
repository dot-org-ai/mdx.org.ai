import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from '@mdxui/shadcn'
import { useState, useEffect } from 'react'

const meta: Meta<typeof Progress> = {
  title: 'Components/Feedback/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Progress value={33} className="w-[300px]" />,
}

export const Values: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-1">
        <p className="text-sm">0%</p>
        <Progress value={0} />
      </div>
      <div className="space-y-1">
        <p className="text-sm">25%</p>
        <Progress value={25} />
      </div>
      <div className="space-y-1">
        <p className="text-sm">50%</p>
        <Progress value={50} />
      </div>
      <div className="space-y-1">
        <p className="text-sm">75%</p>
        <Progress value={75} />
      </div>
      <div className="space-y-1">
        <p className="text-sm">100%</p>
        <Progress value={100} />
      </div>
    </div>
  ),
}

export const Animated: Story = {
  render: () => {
    const [progress, setProgress] = useState(13)

    useEffect(() => {
      const timer = setTimeout(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 10))
      }, 500)
      return () => clearTimeout(timer)
    }, [progress])

    return (
      <div className="w-[300px] space-y-2">
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground text-center">{progress}%</p>
      </div>
    )
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <div className="flex justify-between text-sm">
        <span>Uploading...</span>
        <span>66%</span>
      </div>
      <Progress value={66} />
    </div>
  ),
}

export const FileUpload: Story = {
  render: () => {
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState<'idle' | 'uploading' | 'complete'>('idle')

    const startUpload = () => {
      setStatus('uploading')
      setProgress(0)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setStatus('complete')
            return 100
          }
          return prev + 5
        })
      }, 100)
    }

    return (
      <div className="w-[350px] space-y-4">
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">document.pdf</p>
              <p className="text-xs text-muted-foreground">2.4 MB</p>
            </div>
          </div>
          {status !== 'idle' && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {status === 'complete' ? 'Upload complete!' : `${progress}% uploaded`}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={startUpload}
          disabled={status === 'uploading'}
          className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        >
          {status === 'idle' ? 'Start Upload' : status === 'uploading' ? 'Uploading...' : 'Upload Again'}
        </button>
      </div>
    )
  },
}

export const MultipleFiles: Story = {
  render: () => (
    <div className="w-[350px] space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">image-1.jpg</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
      <Progress value={100} />

      <div className="flex justify-between items-center pt-2">
        <span className="text-sm font-medium">image-2.jpg</span>
        <span className="text-xs text-muted-foreground">78%</span>
      </div>
      <Progress value={78} />

      <div className="flex justify-between items-center pt-2">
        <span className="text-sm font-medium">image-3.jpg</span>
        <span className="text-xs text-muted-foreground">Queued</span>
      </div>
      <Progress value={0} />
    </div>
  ),
}
