# @mdxui/magicui

Animated UI components for hero sections and landing pages - backgrounds, text effects, and interactive elements.

## Installation

```bash
pnpm add @mdxui/magicui
```

For WebGL backgrounds (optional):
```bash
pnpm add @mdxui/magicui ogl
```

## Usage

### SVG Backgrounds (No Dependencies)

Lightweight animated backgrounds that work everywhere:

```tsx
import { Waves, StripedPattern } from '@mdxui/magicui/backgrounds'

function Hero() {
  return (
    <section style={{ position: 'relative', height: '100vh' }}>
      <Waves />
      <h1 style={{ position: 'relative', zIndex: 1 }}>
        Your Content Here
      </h1>
    </section>
  )
}
```

### Background Type System

```tsx
import { BackgroundType, requiresWebGL } from '@mdxui/magicui'

const bg: BackgroundType = 'waves'

if (requiresWebGL(bg)) {
  // Lazy load WebGL dependencies
  const { Particles } = await import('@mdxui/magicui/backgrounds')
}
```

## Available Components

### Backgrounds

**SVG (Built-in)**
- `Waves` - Animated wave patterns
- `StripedPattern` - Striped background effect

**WebGL (Requires `ogl`)**
- `Particles` - Particle system
- `LightRays` - Light ray effects
- `Orb` - Floating orb animation
- `Shapes` - Geometric shapes
- `PixelBlast` - Pixel explosion effect
- `RippleGrid` - Interactive grid ripples

### Text Effects

```tsx
import { text } from '@mdxui/magicui'
// Text animation components
```

### Effects

```tsx
import { effects } from '@mdxui/magicui'
// Interactive UI effects
```

## Component Props

### Waves

```tsx
interface WavesProps {
  color?: string
  opacity?: number
  speed?: number
  className?: string
  style?: React.CSSProperties
}
```

### StripedPattern

```tsx
interface StripedPatternProps {
  angle?: number
  color1?: string
  color2?: string
  thickness?: number
  className?: string
  style?: React.CSSProperties
}
```

## Peer Dependencies

- `react` - ^18.0.0 || ^19.0.0
- `ogl` - ^1.0.0 (optional, for WebGL components)

## Tree Shaking

Import from subpaths to avoid bundling unused components:

```tsx
// Good - only bundles Waves
import { Waves } from '@mdxui/magicui/backgrounds'

// Also fine - tree-shakeable
import { Waves } from '@mdxui/magicui'
```

## License

MIT
