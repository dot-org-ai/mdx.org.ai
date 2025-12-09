import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'

/* -------------------------------------------------------------------------------------------------
 * AspectRatio
 * -----------------------------------------------------------------------------------------------*/

const NAME = 'AspectRatio'

type AspectRatioElement = ElementRef<'div'>
interface AspectRatioProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * The desired aspect ratio, expressed as width / height.
   * @example 16 / 9 for a 16:9 ratio
   */
  ratio?: number
}

/**
 * AspectRatio maintains a consistent width-to-height ratio for its content.
 *
 * @example
 * ```tsx
 * <AspectRatio ratio={16 / 9}>
 *   <img src="..." alt="..." style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
 * </AspectRatio>
 * ```
 */
const AspectRatio = forwardRef<AspectRatioElement, AspectRatioProps>(
  (props, forwardedRef) => {
    const { ratio = 1 / 1, style, children, ...aspectRatioProps } = props

    return (
      <div
        style={{
          // Ensures inner element is contained
          position: 'relative',
          // Ensures padding bottom trick works
          width: '100%',
          paddingBottom: `${100 / ratio}%`,
        }}
        data-radix-aspect-ratio-wrapper=""
      >
        <div
          {...aspectRatioProps}
          ref={forwardedRef}
          style={{
            ...style,
            // Ensures children expand to fill container
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    )
  }
)

AspectRatio.displayName = NAME

/* ---------------------------------------------------------------------------------------------- */

const Root = AspectRatio

export {
  AspectRatio,
  Root,
}
export type { AspectRatioProps }
