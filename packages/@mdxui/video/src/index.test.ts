import { describe, it, expect } from 'vitest'
import {
  extractScenes,
  getSceneAtTime,
  getSceneAtFrame,
  timeToFrame,
  frameToTime,
  getProgress,
  getSceneProgress,
  formatDuration,
  calculateDuration,
  createComposition,
  createRenderer,
  defaultVideoConfig,
  resolutionDimensions,
  type MDXLDDocument,
  type VideoComposition,
} from './index.js'

const createDoc = (content: string, data: Record<string, unknown> = {}): MDXLDDocument => ({
  content,
  data,
})

describe('@mdxui/video', () => {
  describe('extractScenes', () => {
    it('should extract scenes from --- separators', () => {
      const doc = createDoc(`
# Scene 1

Content here.

---

# Scene 2

More content.

---

# Scene 3

Even more.
      `)

      const video = extractScenes(doc)

      expect(video.scenes).toHaveLength(3)
      expect(video.scenes[0].content).toContain('Scene 1')
      expect(video.scenes[1].content).toContain('Scene 2')
      expect(video.scenes[2].content).toContain('Scene 3')
    })

    it('should set default duration for scenes', () => {
      const doc = createDoc(`
# Scene 1

---

# Scene 2
      `)

      const video = extractScenes(doc, {}, { defaultDuration: 5 })

      expect(video.scenes[0].duration).toBe(5)
      expect(video.scenes[1].duration).toBe(5)
      expect(video.duration).toBe(10)
    })

    it('should parse scene-level duration from frontmatter', () => {
      const doc = createDoc(`
---
duration: 10
---

# Scene 1
      `)

      const video = extractScenes(doc)

      expect(video.scenes[0].duration).toBe(10)
    })

    it('should calculate start times', () => {
      const doc = createDoc(`
# Scene 1

---

# Scene 2

---

# Scene 3
      `)

      const video = extractScenes(doc, {}, { defaultDuration: 5 })

      expect(video.scenes[0].startTime).toBe(0)
      expect(video.scenes[1].startTime).toBe(5.5) // 5 + 0.5 transition
      expect(video.scenes[2].startTime).toBe(11) // 5 + 0.5 + 5 + 0.5
    })

    it('should calculate total frames', () => {
      const doc = createDoc(`
# Scene 1

---

# Scene 2
      `)

      const video = extractScenes(doc, { fps: 30 }, { defaultDuration: 5 })

      // 2 scenes * 5 seconds = 10 seconds * 30 fps = 300 frames
      expect(video.totalFrames).toBe(300)
    })

    it('should extract code blocks', () => {
      const doc = createDoc(`
# Code Scene

\`\`\`typescript
const x = 1
\`\`\`
      `)

      const video = extractScenes(doc)

      expect(video.scenes[0].codeBlocks).toHaveLength(1)
      expect(video.scenes[0].codeBlocks?.[0].language).toBe('typescript')
    })

    it('should apply resolution preset', () => {
      const doc = createDoc('# Test')

      const video = extractScenes(doc, { resolution: '4k' })

      expect(video.config.width).toBe(3840)
      expect(video.config.height).toBe(2160)
    })
  })

  describe('timeline utilities', () => {
    const createTestVideo = (): VideoComposition => ({
      config: { ...defaultVideoConfig, fps: 30 },
      scenes: [
        { index: 0, content: '', duration: 5, startTime: 0 },
        { index: 1, content: '', duration: 5, startTime: 5 },
        { index: 2, content: '', duration: 5, startTime: 10 },
      ],
      duration: 15,
      totalFrames: 450,
    })

    describe('getSceneAtTime', () => {
      it('should return scene at given time', () => {
        const video = createTestVideo()

        expect(getSceneAtTime(video, 2)?.index).toBe(0)
        expect(getSceneAtTime(video, 7)?.index).toBe(1)
        expect(getSceneAtTime(video, 12)?.index).toBe(2)
      })

      it('should return last scene for time beyond duration', () => {
        const video = createTestVideo()

        expect(getSceneAtTime(video, 100)?.index).toBe(2)
      })
    })

    describe('getSceneAtFrame', () => {
      it('should return scene at given frame', () => {
        const video = createTestVideo()

        expect(getSceneAtFrame(video, 60)?.index).toBe(0) // 2 seconds at 30fps
        expect(getSceneAtFrame(video, 210)?.index).toBe(1) // 7 seconds
        expect(getSceneAtFrame(video, 360)?.index).toBe(2) // 12 seconds
      })
    })

    describe('timeToFrame', () => {
      it('should convert time to frame number', () => {
        expect(timeToFrame(5, 30)).toBe(150)
        expect(timeToFrame(2.5, 60)).toBe(150)
      })
    })

    describe('frameToTime', () => {
      it('should convert frame to time', () => {
        expect(frameToTime(150, 30)).toBe(5)
        expect(frameToTime(150, 60)).toBe(2.5)
      })
    })

    describe('getProgress', () => {
      it('should return progress through video', () => {
        const video = createTestVideo()

        expect(getProgress(video, 0)).toBe(0)
        expect(getProgress(video, 225)).toBe(0.5)
        expect(getProgress(video, 450)).toBe(1)
      })
    })

    describe('getSceneProgress', () => {
      it('should return progress through scene', () => {
        const scene = { index: 1, content: '', duration: 5, startTime: 5 }

        expect(getSceneProgress(scene, 5)).toBe(0)
        expect(getSceneProgress(scene, 7.5)).toBe(0.5)
        expect(getSceneProgress(scene, 10)).toBe(1)
      })
    })
  })

  describe('formatDuration', () => {
    it('should format seconds as MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00')
      expect(formatDuration(65)).toBe('01:05')
      expect(formatDuration(125)).toBe('02:05')
      expect(formatDuration(3600)).toBe('60:00')
    })
  })

  describe('calculateDuration', () => {
    it('should sum scene durations', () => {
      const scenes = [
        { index: 0, content: '', duration: 5 },
        { index: 1, content: '', duration: 10 },
        { index: 2, content: '', duration: 3 },
      ]

      expect(calculateDuration(scenes)).toBe(18)
    })
  })

  describe('createComposition', () => {
    it('should create composition from scenes array', () => {
      const composition = createComposition(
        [{ title: 'Intro', duration: 5 }, { title: 'Main', duration: 10 }],
        { fps: 60 }
      )

      expect(composition.scenes).toHaveLength(2)
      expect(composition.scenes[0].startTime).toBe(0)
      expect(composition.scenes[1].startTime).toBe(5)
      expect(composition.duration).toBe(15)
      expect(composition.totalFrames).toBe(900) // 15s * 60fps
    })
  })

  describe('createRenderer', () => {
    it('should create a renderer with name and render function', () => {
      const renderer = createRenderer<string>('test', (composition) => {
        return `Video: ${composition.duration}s`
      })

      expect(renderer.name).toBe('test')

      const composition = createComposition([{ duration: 10 }])
      expect(renderer.render(composition)).toBe('Video: 10s')
    })
  })

  describe('resolutionDimensions', () => {
    it('should have correct dimensions for all resolutions', () => {
      expect(resolutionDimensions['1080p']).toEqual({ width: 1920, height: 1080 })
      expect(resolutionDimensions['4k']).toEqual({ width: 3840, height: 2160 })
    })
  })
})
