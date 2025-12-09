/**
 * Text components - Typography for dashboard content
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Text
 * -----------------------------------------------------------------------------------------------*/

type TextElement = HTMLParagraphElement
interface TextProps extends ComponentPropsWithoutRef<'p'> {
  /** Text color */
  color?: string
}

const Text = forwardRef<TextElement, TextProps>(
  ({ className = '', color, ...props }, ref) => {
    return (
      <Primitive.p
        ref={ref}
        className={`text-sm text-muted-foreground ${className}`.trim()}
        style={color ? { color } : undefined}
        {...props}
      />
    )
  }
)
Text.displayName = 'Text'

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/

type TitleElement = HTMLHeadingElement
interface TitleProps extends ComponentPropsWithoutRef<'h3'> {
  /** Text color */
  color?: string
}

const Title = forwardRef<TitleElement, TitleProps>(
  ({ className = '', color, ...props }, ref) => {
    return (
      <Primitive.h3
        ref={ref}
        className={`text-lg font-medium ${className}`.trim()}
        style={color ? { color } : undefined}
        {...props}
      />
    )
  }
)
Title.displayName = 'Title'

/* -------------------------------------------------------------------------------------------------
 * Subtitle
 * -----------------------------------------------------------------------------------------------*/

type SubtitleElement = HTMLParagraphElement
interface SubtitleProps extends ComponentPropsWithoutRef<'p'> {
  /** Text color */
  color?: string
}

const Subtitle = forwardRef<SubtitleElement, SubtitleProps>(
  ({ className = '', color, ...props }, ref) => {
    return (
      <Primitive.p
        ref={ref}
        className={`text-base text-muted-foreground ${className}`.trim()}
        style={color ? { color } : undefined}
        {...props}
      />
    )
  }
)
Subtitle.displayName = 'Subtitle'

/* -------------------------------------------------------------------------------------------------
 * Metric
 * -----------------------------------------------------------------------------------------------*/

type MetricElement = HTMLParagraphElement
interface MetricProps extends ComponentPropsWithoutRef<'p'> {
  /** Text color */
  color?: string
}

const Metric = forwardRef<MetricElement, MetricProps>(
  ({ className = '', color, ...props }, ref) => {
    return (
      <Primitive.p
        ref={ref}
        className={`text-3xl font-semibold ${className}`.trim()}
        style={color ? { color } : undefined}
        {...props}
      />
    )
  }
)
Metric.displayName = 'Metric'

/* -------------------------------------------------------------------------------------------------
 * Bold
 * -----------------------------------------------------------------------------------------------*/

type BoldElement = HTMLSpanElement
interface BoldProps extends ComponentPropsWithoutRef<'strong'> {}

const Bold = forwardRef<BoldElement, BoldProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <strong
        ref={ref}
        className={`font-semibold ${className}`.trim()}
        {...props}
      />
    )
  }
)
Bold.displayName = 'Bold'

/* -------------------------------------------------------------------------------------------------
 * Italic
 * -----------------------------------------------------------------------------------------------*/

type ItalicElement = HTMLElement
interface ItalicProps extends ComponentPropsWithoutRef<'em'> {}

const Italic = forwardRef<ItalicElement, ItalicProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <em
        ref={ref}
        className={className}
        {...props}
      />
    )
  }
)
Italic.displayName = 'Italic'

export { Text, Title, Subtitle, Metric, Bold, Italic }
export type { TextProps, TitleProps, SubtitleProps, MetricProps, BoldProps, ItalicProps }
