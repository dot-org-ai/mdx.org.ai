/**
 * @mdxui/radix - ScrollArea
 * A scrollable area with custom scrollbar styling.
 * TODO: Full implementation
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

const SCROLL_AREA_NAME = 'ScrollArea'
type ScopedProps<P> = P & { __scopeScrollArea?: Scope }
const [createScrollAreaContext, createScrollAreaScope] = createContextScope(SCROLL_AREA_NAME)

type ScrollAreaElement = ElementRef<typeof Primitive.div>
interface ScrollAreaProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  type?: 'auto' | 'always' | 'scroll' | 'hover'
  scrollHideDelay?: number
  dir?: 'ltr' | 'rtl'
}

const ScrollArea = forwardRef<ScrollAreaElement, ScopedProps<ScrollAreaProps>>((props, ref) => {
  const { __scopeScrollArea, type = 'hover', scrollHideDelay = 600, dir, ...areaProps } = props
  return (
    <Primitive.div data-radix-scroll-area-root="" {...areaProps} ref={ref} style={{ position: 'relative', overflow: 'hidden', ...props.style }} />
  )
})
ScrollArea.displayName = SCROLL_AREA_NAME

type ScrollAreaViewportElement = ElementRef<typeof Primitive.div>
interface ScrollAreaViewportProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const ScrollAreaViewport = forwardRef<ScrollAreaViewportElement, ScopedProps<ScrollAreaViewportProps>>(
  (props, ref) => {
    const { __scopeScrollArea, ...viewportProps } = props
    return (
      <Primitive.div
        {...viewportProps}
        ref={ref}
        style={{ width: '100%', height: '100%', overflow: 'scroll', ...props.style }}
      />
    )
  }
)
ScrollAreaViewport.displayName = 'ScrollAreaViewport'

type ScrollAreaScrollbarElement = ElementRef<typeof Primitive.div>
interface ScrollAreaScrollbarProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  orientation?: 'horizontal' | 'vertical'
  forceMount?: true
}

const ScrollAreaScrollbar = forwardRef<ScrollAreaScrollbarElement, ScopedProps<ScrollAreaScrollbarProps>>(
  (props, ref) => {
    const { __scopeScrollArea, orientation = 'vertical', forceMount, ...scrollbarProps } = props
    return (
      <Primitive.div
        data-orientation={orientation}
        {...scrollbarProps}
        ref={ref}
        style={{ display: 'flex', touchAction: 'none', userSelect: 'none', ...props.style }}
      />
    )
  }
)
ScrollAreaScrollbar.displayName = 'ScrollAreaScrollbar'

type ScrollAreaThumbElement = ElementRef<typeof Primitive.div>
interface ScrollAreaThumbProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const ScrollAreaThumb = forwardRef<ScrollAreaThumbElement, ScopedProps<ScrollAreaThumbProps>>(
  (props, ref) => {
    const { __scopeScrollArea, ...thumbProps } = props
    return <Primitive.div {...thumbProps} ref={ref} style={{ flex: 1, borderRadius: 'inherit', ...props.style }} />
  }
)
ScrollAreaThumb.displayName = 'ScrollAreaThumb'

type ScrollAreaCornerElement = ElementRef<typeof Primitive.div>
interface ScrollAreaCornerProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const ScrollAreaCorner = forwardRef<ScrollAreaCornerElement, ScopedProps<ScrollAreaCornerProps>>(
  (props, ref) => {
    const { __scopeScrollArea, ...cornerProps } = props
    return <Primitive.div {...cornerProps} ref={ref} />
  }
)
ScrollAreaCorner.displayName = 'ScrollAreaCorner'

const Root = ScrollArea
const Viewport = ScrollAreaViewport
const Scrollbar = ScrollAreaScrollbar
const Thumb = ScrollAreaThumb
const Corner = ScrollAreaCorner

export {
  createScrollAreaScope,
  ScrollArea,
  ScrollAreaViewport,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaCorner,
  Root,
  Viewport,
  Scrollbar,
  Thumb,
  Corner,
}
export type {
  ScrollAreaProps,
  ScrollAreaViewportProps,
  ScrollAreaScrollbarProps,
  ScrollAreaThumbProps,
  ScrollAreaCornerProps,
}
