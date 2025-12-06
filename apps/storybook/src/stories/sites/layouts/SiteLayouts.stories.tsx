import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, Badge } from '@mdxui/shadcn'

// Layout preview component
const LayoutPreview = ({
  name,
  description,
  structure,
  useCase,
  children,
}: {
  name: string
  description: string
  structure: string
  useCase: string
  children: React.ReactNode
}) => (
  <Card className="w-[700px]">
    <CardContent className="p-6 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold">{name}</h3>
          <Badge variant="outline">{useCase}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">Structure: {structure}</p>
      </div>

      {/* Visual preview */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {children}
      </div>

      {/* Code example */}
      <div className="font-mono text-xs bg-slate-900 text-slate-300 p-3 rounded-lg">
        <span className="text-purple-400">{'<Site'}</span>
        <span className="text-cyan-400"> layout</span>
        <span className="text-slate-500">=</span>
        <span className="text-green-400">"{name.toLowerCase()}"</span>
        <span className="text-purple-400">{'>'}</span>
        <div className="ml-4 text-slate-500">...</div>
        <span className="text-purple-400">{'</Site>'}</span>
      </div>
    </CardContent>
  </Card>
)

// Marketing Layout
const MarketingLayout = () => (
  <LayoutPreview
    name="Marketing"
    description="Full-width sections stacked vertically with header and footer chrome"
    structure="Header → Sections → Footer"
    useCase="Landing pages"
  >
    <div className="h-64 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b bg-slate-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="font-bold text-sm">Logo</div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Features</span>
            <span>Pricing</span>
            <span>Docs</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-xs">Sign In</span>
          <span className="text-xs bg-primary text-white px-2 py-1 rounded">Get Started</span>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-auto">
        <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-50 flex items-center justify-center text-xs text-muted-foreground border-b">
          Hero Section
        </div>
        <div className="h-16 flex items-center justify-center text-xs text-muted-foreground border-b">
          Features Section
        </div>
        <div className="h-16 bg-slate-50 flex items-center justify-center text-xs text-muted-foreground border-b">
          Pricing Section
        </div>
        <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
          CTA Section
        </div>
      </div>

      {/* Footer */}
      <div className="h-10 border-t bg-slate-900 text-white flex items-center justify-center text-xs">
        Footer
      </div>
    </div>
  </LayoutPreview>
)

// Docs Layout
const DocsLayout = () => (
  <LayoutPreview
    name="Docs"
    description="Three-column layout with navigation sidebar, content, and table of contents"
    structure="Header → [Sidebar + Content + TOC] → Footer"
    useCase="Documentation"
  >
    <div className="h-64 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b bg-slate-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="font-bold text-sm">Docs</div>
          <div className="flex-1 mx-4">
            <div className="h-7 bg-slate-100 rounded px-2 flex items-center text-xs text-muted-foreground">
              Search docs...
            </div>
          </div>
        </div>
        <div className="text-xs">v1.0.0</div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-48 border-r bg-slate-50 p-3">
          <div className="text-xs font-medium mb-2">Getting Started</div>
          <div className="space-y-1 text-xs text-muted-foreground ml-2">
            <div className="text-primary">Introduction</div>
            <div>Installation</div>
            <div>Quick Start</div>
          </div>
          <div className="text-xs font-medium mt-4 mb-2">Guide</div>
          <div className="space-y-1 text-xs text-muted-foreground ml-2">
            <div>Concepts</div>
            <div>Components</div>
            <div>Themes</div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4">
          <h1 className="text-sm font-bold mb-2">Introduction</h1>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Welcome to the documentation...</p>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-2/3"></div>
          </div>
        </div>

        {/* TOC */}
        <div className="w-40 border-l p-3">
          <div className="text-xs font-medium mb-2">On this page</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Overview</div>
            <div>Installation</div>
            <div>Usage</div>
            <div>API</div>
          </div>
        </div>
      </div>
    </div>
  </LayoutPreview>
)

// Blog Layout
const BlogLayout = () => (
  <LayoutPreview
    name="Blog"
    description="Content-focused layout with optional sidebar for categories/tags"
    structure="Header → [Content + Sidebar?] → Footer"
    useCase="Articles"
  >
    <div className="h-64 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b bg-slate-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="font-bold text-sm">Blog</div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>All Posts</span>
            <span>Categories</span>
            <span>About</span>
          </div>
        </div>
        <div className="text-xs">Subscribe</div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex">
        {/* Main content */}
        <div className="flex-1 p-4 max-w-2xl mx-auto">
          <div className="text-xs text-muted-foreground mb-1">March 15, 2025</div>
          <h1 className="text-sm font-bold mb-2">How We Built Our Platform</h1>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
            <div className="h-20 bg-slate-100 rounded w-full my-4"></div>
            <div className="h-3 bg-slate-100 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-2/3"></div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-48 border-l p-3">
          <div className="text-xs font-medium mb-2">Categories</div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">Engineering</Badge>
            <Badge variant="secondary" className="text-[10px]">Design</Badge>
            <Badge variant="secondary" className="text-[10px]">Product</Badge>
          </div>
          <div className="text-xs font-medium mt-4 mb-2">Recent Posts</div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div>Another Post Title</div>
            <div>Some Other Article</div>
          </div>
        </div>
      </div>
    </div>
  </LayoutPreview>
)

// Minimal Layout
const MinimalLayout = () => (
  <LayoutPreview
    name="Minimal"
    description="Content only, no chrome. Perfect for embeds or focused experiences"
    structure="Content only"
    useCase="Embeds"
  >
    <div className="h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <div className="text-center">
        <h1 className="text-lg font-bold mb-2">Focused Content</h1>
        <p className="text-sm text-muted-foreground mb-4">No header, no footer, just content</p>
        <div className="inline-block bg-primary text-white text-xs px-4 py-2 rounded">
          Call to Action
        </div>
      </div>
    </div>
  </LayoutPreview>
)

// Centered Layout
const CenteredLayout = () => (
  <LayoutPreview
    name="Centered"
    description="Centered content with max-width constraint"
    structure="Header → Centered content → Footer"
    useCase="Auth, Forms"
  >
    <div className="h-64 flex flex-col">
      {/* Header */}
      <div className="h-12 border-b bg-slate-50 flex items-center justify-center px-4">
        <div className="font-bold text-sm">Logo</div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="w-80 bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-sm font-bold mb-4 text-center">Sign In</h2>
          <div className="space-y-3">
            <div className="h-8 bg-slate-100 rounded"></div>
            <div className="h-8 bg-slate-100 rounded"></div>
            <div className="h-8 bg-primary rounded"></div>
          </div>
          <div className="text-xs text-center text-muted-foreground mt-4">
            Don't have an account? Sign up
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-8 border-t flex items-center justify-center text-xs text-muted-foreground">
        © 2025 Company
      </div>
    </div>
  </LayoutPreview>
)

const meta: Meta = {
  title: 'Sites/Layouts',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

export const Marketing: StoryObj = {
  render: () => <MarketingLayout />,
}

export const Docs: StoryObj = {
  render: () => <DocsLayout />,
}

export const Blog: StoryObj = {
  render: () => <BlogLayout />,
}

export const Minimal: StoryObj = {
  render: () => <MinimalLayout />,
}

export const Centered: StoryObj = {
  render: () => <CenteredLayout />,
}
