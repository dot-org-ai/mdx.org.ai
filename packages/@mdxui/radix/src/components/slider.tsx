/**
 * @mdxui/radix - Slider
 * A slider input for selecting a value within a range.
 * TODO: Full implementation
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

const SLIDER_NAME = 'Slider'
type ScopedProps<P> = P & { __scopeSlider?: Scope }
const [createSliderContext, createSliderScope] = createContextScope(SLIDER_NAME)

type SliderElement = ElementRef<typeof Primitive.span>
interface SliderProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.span>, 'defaultValue'> {
  value?: number[]
  defaultValue?: number[]
  onValueChange?(value: number[]): void
  onValueCommit?(value: number[]): void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  dir?: 'ltr' | 'rtl'
  inverted?: boolean
}

const Slider = forwardRef<SliderElement, ScopedProps<SliderProps>>((props, ref) => {
  const { __scopeSlider, value, defaultValue, onValueChange, onValueCommit, min, max, step, disabled, orientation, dir, inverted, ...sliderProps } = props
  return (
    <Primitive.span
      role="slider"
      aria-disabled={disabled}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value?.[0]}
      aria-orientation={orientation}
      data-disabled={disabled ? '' : undefined}
      data-orientation={orientation}
      {...sliderProps}
      ref={ref}
    />
  )
})
Slider.displayName = SLIDER_NAME

type SliderTrackElement = ElementRef<typeof Primitive.span>
interface SliderTrackProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}
const SliderTrack = forwardRef<SliderTrackElement, ScopedProps<SliderTrackProps>>((props, ref) => {
  const { __scopeSlider, ...trackProps } = props
  return <Primitive.span {...trackProps} ref={ref} />
})
SliderTrack.displayName = 'SliderTrack'

type SliderRangeElement = ElementRef<typeof Primitive.span>
interface SliderRangeProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}
const SliderRange = forwardRef<SliderRangeElement, ScopedProps<SliderRangeProps>>((props, ref) => {
  const { __scopeSlider, ...rangeProps } = props
  return <Primitive.span {...rangeProps} ref={ref} />
})
SliderRange.displayName = 'SliderRange'

type SliderThumbElement = ElementRef<typeof Primitive.span>
interface SliderThumbProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}
const SliderThumb = forwardRef<SliderThumbElement, ScopedProps<SliderThumbProps>>((props, ref) => {
  const { __scopeSlider, ...thumbProps } = props
  return <Primitive.span role="slider" {...thumbProps} ref={ref} />
})
SliderThumb.displayName = 'SliderThumb'

const Root = Slider
const Track = SliderTrack
const Range = SliderRange
const Thumb = SliderThumb

export {
  createSliderScope,
  Slider,
  SliderTrack,
  SliderRange,
  SliderThumb,
  Root,
  Track,
  Range,
  Thumb,
}
export type { SliderProps, SliderTrackProps, SliderRangeProps, SliderThumbProps }
