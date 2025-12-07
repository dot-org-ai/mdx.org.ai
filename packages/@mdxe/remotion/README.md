# @mdxe/remotion

Remotion video runtime for rendering MDX content as videos.

## Installation

```bash
pnpm add @mdxe/remotion
```

## Usage

### Basic Video Composition

```tsx
import { Composition, registerRoot } from 'remotion'
import { MDXComposition, createCompositionConfig } from '@mdxe/remotion'
import { parse } from 'mdxld'

const mdxContent = `
# Welcome

This is the first slide.

## Features

- Automatic slide extraction
- Code block support
- Customizable themes
`

const doc = parse(mdxContent)
const config = createCompositionConfig(doc)

export const RemotionRoot = () => (
  <Composition
    id={config.id}
    component={() => <MDXComposition doc={doc} />}
    durationInFrames={config.durationInFrames}
    fps={config.fps}
    width={config.width}
    height={config.height}
  />
)

registerRoot(RemotionRoot)
```

### Custom Slide Component

```tsx
import { MDXComposition, type SlideProps } from '@mdxe/remotion'

function CustomSlide({ content, frame, totalFrames, index }: SlideProps) {
  const progress = frame / totalFrames

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <h1 style={{ opacity: Math.min(1, frame / 30) }}>
        {content.title}
      </h1>
      <p>{content.body}</p>
    </AbsoluteFill>
  )
}

<MDXComposition doc={doc} SlideComponent={CustomSlide} />
```

### Configuration

```tsx
import { MDXComposition, type VideoConfig } from '@mdxe/remotion'

const config: VideoConfig = {
  fps: 60,              // Frames per second
  width: 1920,          // Video width
  height: 1080,         // Video height
  durationPerSlide: 3,  // Seconds per slide
}

<MDXComposition doc={doc} config={config} />
```

## API

### Components

- `MDXComposition` - Main composition component
- `DefaultSlide` - Built-in slide component

### Functions

- `extractSlides(doc)` - Extract slides from document
- `calculateDuration(doc, config)` - Get total frame count
- `createCompositionConfig(doc, config)` - Generate Remotion config

### Types

```typescript
interface VideoConfig {
  fps?: number
  width?: number
  height?: number
  durationPerSlide?: number
}

interface SlideProps {
  content: SlideContent
  frame: number
  totalFrames: number
  index: number
}

interface SlideContent {
  title?: string
  body: string
  codeBlocks: CodeBlock[]
}
```

## Rendering

```bash
# Preview
npx remotion preview src/index.tsx

# Render to MP4
npx remotion render src/index.tsx mdx-video out.mp4

# Render to GIF
npx remotion render src/index.tsx mdx-video out.gif --image-format png
```

## License

MIT
