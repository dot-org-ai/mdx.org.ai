import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Code, FolderTree, Terminal, MessageSquare, Play, Settings, GitBranch, Search, Layers, Maximize2 } from 'lucide-react'

// Panel preview
const PanelPreview = ({
  position,
  content,
  icon: Icon,
}: {
  position: string
  content: string
  icon: React.ElementType
}) => (
  <div className={`
    flex items-center justify-center gap-1 text-xs text-muted-foreground
    ${position === 'sidebar' ? 'flex-col h-full' : ''}
    ${position === 'bottom' ? 'border-t' : ''}
    ${position === 'aside' ? 'border-l' : ''}
  `}>
    <Icon className="h-3 w-3" />
    <span>{content}</span>
  </div>
)

// WorkspaceApp component
const WorkspaceApp = ({
  name,
  description,
  type,
  panels,
  features,
  languages,
}: {
  name: string
  description: string
  type: 'IDE' | 'Design' | 'Writing' | 'Data' | 'No-Code'
  panels: {
    sidebar: string
    main: string
    aside?: string
    bottom?: string
  }
  features: string[]
  languages?: string[]
}) => (
  <Card className="w-[650px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Code className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Workspace App</CardTitle>
            <Badge>{type}</Badge>
          </div>
          <CardDescription>IDE-like creation environment</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* App info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      {/* Workspace layout preview */}
      <div className="border rounded-lg overflow-hidden bg-slate-900 text-white">
        {/* Activity bar */}
        <div className="flex h-56">
          <div className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-slate-700">
              <FolderTree className="h-4 w-4" />
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-700">
              <GitBranch className="h-4 w-4 text-slate-400" />
            </div>
            <div className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-700">
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex-1" />
            <div className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-700">
              <Settings className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="h-9 border-b border-slate-700 bg-slate-800/50 flex items-center px-2 gap-1">
              <div className="px-3 py-1 bg-slate-900 rounded-t text-xs flex items-center gap-1">
                <Code className="h-3 w-3" />
                <span>index.tsx</span>
              </div>
              <div className="px-3 py-1 text-xs text-slate-400">App.tsx</div>
            </div>

            <div className="flex-1 flex">
              {/* Sidebar */}
              <div className="w-48 border-r border-slate-700 p-2">
                <div className="text-xs text-slate-400 mb-2">{panels.sidebar.toUpperCase()}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-slate-300">
                    <FolderTree className="h-3 w-3" />
                    <span>src</span>
                  </div>
                  <div className="ml-4 text-slate-400">├── components</div>
                  <div className="ml-4 text-slate-400">├── pages</div>
                  <div className="ml-4 text-slate-400">└── utils</div>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 p-3">
                <div className="text-xs text-slate-400 mb-2">{panels.main.toUpperCase()}</div>
                <div className="font-mono text-xs text-slate-300 space-y-0.5">
                  <div><span className="text-purple-400">import</span> {'{'} useState {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span></div>
                  <div></div>
                  <div><span className="text-purple-400">export function</span> <span className="text-yellow-400">App</span>() {'{'}</div>
                  <div className="text-slate-500">  // Your code here</div>
                  <div>{'}'}</div>
                </div>
              </div>

              {/* Aside */}
              {panels.aside && (
                <div className="w-64 border-l border-slate-700 p-2">
                  <div className="text-xs text-slate-400 mb-2">{panels.aside.toUpperCase()}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    AI Assistant ready...
                  </div>
                </div>
              )}
            </div>

            {/* Bottom panel */}
            {panels.bottom && (
              <div className="h-24 border-t border-slate-700 p-2">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-slate-300">Terminal</Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-slate-400">Problems</Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-slate-400">Output</Button>
                </div>
                <div className="font-mono text-xs text-slate-400">
                  $ npm run dev
                  <br />
                  <span className="text-green-400">ready</span> - started server on localhost:3000
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Languages/tools */}
      {languages && (
        <div>
          <h4 className="text-sm font-medium mb-2">Supported Languages</h4>
          <div className="flex flex-wrap gap-1">
            {languages.map(lang => (
              <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div>
        <h4 className="text-sm font-medium mb-2">Features</h4>
        <div className="flex flex-wrap gap-1">
          {features.map(feature => (
            <Badge key={feature} variant="secondary" className="text-xs">{feature}</Badge>
          ))}
        </div>
      </div>

      {/* Structure */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">APP STRUCTURE</div>
        <div className="font-mono text-xs space-y-1 text-muted-foreground">
          <div>WorkspaceApp</div>
          <div className="ml-4">├── ActivityBar (tool icons)</div>
          <div className="ml-4">├── Panel: Sidebar ({panels.sidebar})</div>
          <div className="ml-4">├── Panel: Main ({panels.main})</div>
          {panels.aside && <div className="ml-4">├── Panel: Aside ({panels.aside})</div>}
          {panels.bottom && <div className="ml-4">└── Panel: Bottom ({panels.bottom})</div>}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
        <Button size="sm">
          <Play className="h-4 w-4 mr-1" />
          Launch
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof WorkspaceApp> = {
  title: 'Apps/WorkspaceApp',
  component: WorkspaceApp,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A WorkspaceApp provides an IDE-like environment with file tree, editor, terminal, and AI assistant panels for creation workflows.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const CodeEditor: Story = {
  args: {
    name: 'Code Studio',
    description: 'Full-featured code editor with AI assistance',
    type: 'IDE',
    panels: {
      sidebar: 'File Tree',
      main: 'Editor',
      aside: 'AI Chat',
      bottom: 'Terminal',
    },
    languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'HTML', 'CSS', 'SQL'],
    features: ['IntelliSense', 'Git Integration', 'Debugging', 'Extensions', 'Themes', 'Keybindings', 'Multi-cursor'],
  },
}

export const DesignTool: Story = {
  args: {
    name: 'Design Studio',
    description: 'Visual design and prototyping workspace',
    type: 'Design',
    panels: {
      sidebar: 'Layers',
      main: 'Canvas',
      aside: 'Properties',
    },
    features: ['Vector Tools', 'Components', 'Prototyping', 'Collaboration', 'Design Tokens', 'Export'],
  },
}

export const WritingApp: Story = {
  args: {
    name: 'Writer',
    description: 'Distraction-free writing with AI assistance',
    type: 'Writing',
    panels: {
      sidebar: 'Outline',
      main: 'Editor',
      aside: 'AI Suggestions',
    },
    features: ['Markdown', 'Focus Mode', 'Word Count', 'Export', 'Version History', 'AI Rewrite'],
  },
}

export const DataStudio: Story = {
  args: {
    name: 'Data Studio',
    description: 'SQL editor and data visualization',
    type: 'Data',
    panels: {
      sidebar: 'Schema',
      main: 'Query Editor',
      aside: 'AI Assistant',
      bottom: 'Results',
    },
    languages: ['SQL', 'Python', 'R'],
    features: ['Query Builder', 'Visualizations', 'Saved Queries', 'Scheduling', 'Export', 'Sharing'],
  },
}

export const NoCodeBuilder: Story = {
  args: {
    name: 'App Builder',
    description: 'Visual no-code app development',
    type: 'No-Code',
    panels: {
      sidebar: 'Components',
      main: 'Canvas',
      aside: 'Properties',
    },
    features: ['Drag & Drop', 'Data Binding', 'Logic Flows', 'API Integration', 'Preview', 'Publish'],
  },
}
