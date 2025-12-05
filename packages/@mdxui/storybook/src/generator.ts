/**
 * Story Generator
 *
 * Generates Storybook stories from MDX files.
 */

import type { MDXFile } from './loader'
import type { LayoutInfo } from './parser'

export interface StoryGeneratorOptions {
  /** Output format */
  format?: 'esm' | 'cjs'
  /** Include autodocs tag */
  autodocs?: boolean
  /** Custom category prefix */
  categoryPrefix?: string
}

export interface GeneratedStory {
  /** Story file content */
  content: string
  /** Suggested file path */
  path: string
  /** Story title */
  title: string
  /** MDX file this was generated from */
  source: MDXFile
}

/**
 * Generate a Storybook story from an MDX file
 */
export function generateStory(file: MDXFile, options: StoryGeneratorOptions = {}): GeneratedStory | null {
  if (!file.layout) {
    return null
  }

  const { autodocs = true, categoryPrefix = 'Examples' } = options

  const { layout } = file
  const storyTitle = `${categoryPrefix}/${layout.mapping.category}/${layout.name}`

  const content = generateStoryContent(file, layout, storyTitle, autodocs)

  return {
    content,
    path: `${file.directory}/${file.name}.stories.tsx`,
    title: storyTitle,
    source: file,
  }
}

/**
 * Generate stories from multiple MDX files
 */
export function generateStories(files: MDXFile[], options: StoryGeneratorOptions = {}): GeneratedStory[] {
  const stories: GeneratedStory[] = []

  for (const file of files) {
    const story = generateStory(file, options)
    if (story) {
      stories.push(story)
    }
  }

  return stories
}

/**
 * Generate the actual story file content
 */
function generateStoryContent(file: MDXFile, layout: LayoutInfo, title: string, autodocs: boolean): string {
  const { mapping, props, name, description } = layout

  const propsJson = JSON.stringify(props, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n')

  // Escape backticks in description
  const safeDescription = description.replace(/`/g, "'")
  const safePath = file.relativePath.replace(/`/g, "'")

  return `/**
 * Auto-generated story from ${file.relativePath}
 *
 * @generated
 */

import type { Meta, StoryObj } from '@storybook/react'
import { ${mapping.component} } from '${mapping.package}'

const meta: Meta<typeof ${mapping.component}> = {
  title: '${title}',
  component: ${mapping.component},
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: \`## ${name}

${safeDescription}

**Layout:** ${mapping.component}
**Category:** ${mapping.category}

---

*This story was auto-generated from ${safePath}*\`,
      },
    },
  },
  ${autodocs ? "tags: ['autodocs']," : ''}
}

export default meta
type Story = StoryObj<typeof ${mapping.component}>

export const Default: Story = {
  args: ${propsJson},
}

// Variant stories can be added manually below
`
}

/**
 * Generate an index file that re-exports all stories
 */
export function generateStoriesIndex(stories: GeneratedStory[]): string {
  const exports = stories.map((story) => {
    // Sanitize names to be valid JS identifiers
    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_')
    const moduleName = sanitize(story.source.directory) + '_' + sanitize(story.source.name)
    return `export * as ${moduleName} from './${story.source.directory}/${story.source.name}.stories'`
  })

  return `/**
 * Auto-generated stories index
 *
 * @generated
 */

${exports.join('\n')}
`
}
