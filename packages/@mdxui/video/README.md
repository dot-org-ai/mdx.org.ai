# @mdxui/video

Abstract video rendering interface for MDX content.

## Overview

This package provides abstract types and utilities for rendering MDXLD documents as videos. It defines the common interface that concrete implementations (like `@mdxe/remotion`) use.

## Installation

```bash
pnpm add @mdxui/video
```

## Usage

### Extract Video Scenes from MDX

```typescript
import { extractScenes } from '@mdxui/video'
import { parse } from 'mdxld'

const mdxContent = `
---
title: My Video
fps: 60
resolution: 1080p
---

# Introduction

Welcome to the video!

---
duration: 8
transition: crossfade
---

## Main Content

This is the main section.

\`\`\`typescript
const hello = "world"
\`\`\`

---

# Conclusion

Thanks for watching!
`

const doc = parse(mdxContent)
const video = extractScenes(doc, { fps: 60 })

console.log(video.duration)        // Total duration in seconds
console.log(video.totalFrames)     // Total frame count
console.log(video.scenes.length)   // Number of scenes
```

### Video Configuration

```typescript
import { extractScenes, type VideoConfig } from '@mdxui/video'

const config: VideoConfig = {
  title: 'My Video',
  fps: 60,
  resolution: '4k',     // 3840x2160
  aspectRatio: '16:9',
  format: 'mp4',
  codec: 'h264',
  backgroundColor: '#1a1a2e',
}

const video = extractScenes(doc, config)
```

### Supported Resolutions

| Resolution | Dimensions |
|------------|------------|
| `480p` | 854x480 |
| `720p` | 1280x720 |
| `1080p` | 1920x1080 |
| `1440p` | 2560x1440 |
| `2k` | 2048x1080 |
| `4k` | 3840x2160 |
| `8k` | 7680x4320 |

### Scene Configuration

Scenes can have individual settings via frontmatter:

```markdown
---
duration: 10
transition: fade
transitionDuration: 0.5
---

# Scene Title

Scene content here.
```

### Timeline Utilities

```typescript
import {
  getSceneAtTime,
  getSceneAtFrame,
  timeToFrame,
  frameToTime,
  getProgress,
  formatDuration,
} from '@mdxui/video'

// Get scene at specific time
const scene = getSceneAtTime(video, 15.5) // Scene at 15.5 seconds

// Get scene at specific frame
const sceneAtFrame = getSceneAtFrame(video, 450) // Scene at frame 450

// Convert time to frame
const frame = timeToFrame(5.5, 30) // 165 (at 30fps)

// Get progress through video
const progress = getProgress(video, 300) // 0.5 if total is 600 frames

// Format duration
formatDuration(125) // "02:05"
```

### Create Custom Renderer

```typescript
import { createRenderer, type VideoComposition, type RenderOptions } from '@mdxui/video'

const ffmpegRenderer = createRenderer<Promise<string>>(
  'ffmpeg',
  async (composition: VideoComposition, options?: RenderOptions) => {
    // Generate ffmpeg command or script
    const cmd = `ffmpeg -f lavfi -i color=c=black:s=${composition.config.width}x${composition.config.height} ...`
    return cmd
  }
)

const command = await ffmpegRenderer.render(video)
```

### Scene Transitions

| Transition | Description |
|------------|-------------|
| `none` | No transition |
| `fade` | Fade to black |
| `crossfade` | Crossfade between scenes |
| `slide-left` | Slide from right to left |
| `slide-right` | Slide from left to right |
| `slide-up` | Slide from bottom to top |
| `slide-down` | Slide from top to bottom |
| `zoom-in` | Zoom in effect |
| `zoom-out` | Zoom out effect |
| `wipe` | Wipe transition |

## Types

### VideoComposition

```typescript
interface VideoComposition {
  id?: string
  config: VideoConfig
  scenes: Scene[]
  duration: number
  totalFrames: number
  audio?: SceneAudio
  meta?: Record<string, unknown>
}
```

### Scene

```typescript
interface Scene {
  id?: string
  index: number
  title?: string
  content: string
  duration: number
  startTime?: number
  transition?: SceneTransition
  transitionDuration?: number
  meta?: Record<string, unknown>
  background?: SceneBackground
  audio?: SceneAudio
  codeBlocks?: CodeBlock[]
  keyframes?: Keyframe[]
}
```

### VideoConfig

```typescript
interface VideoConfig {
  title?: string
  description?: string
  fps?: number
  width?: number
  height?: number
  resolution?: VideoResolution
  aspectRatio?: AspectRatio
  format?: VideoFormat
  codec?: 'h264' | 'h265' | 'vp9' | 'av1'
  audioCodec?: 'aac' | 'mp3' | 'opus'
  bitrate?: string
  backgroundColor?: string
}
```

## Integration with Runtime Packages

This package provides the abstract interface. Use runtime packages for actual rendering:

- `@mdxe/remotion` - Remotion video rendering

```typescript
import { extractScenes } from '@mdxui/video'
import { MDXComposition } from '@mdxe/remotion'

const video = extractScenes(doc)
// Use with Remotion components
```

## License

MIT
