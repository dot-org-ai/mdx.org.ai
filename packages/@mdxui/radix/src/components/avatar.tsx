import {
  forwardRef,
  useState,
  useEffect,
  useCallback,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'
import { useLayoutEffect } from '@mdxui/jsx/hooks'

/* -------------------------------------------------------------------------------------------------
 * Avatar
 * -----------------------------------------------------------------------------------------------*/

const AVATAR_NAME = 'Avatar'

type ScopedProps<P> = P & { __scopeAvatar?: Scope }
const [createAvatarContext, createAvatarScope] = createContextScope(AVATAR_NAME)

type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error'

type AvatarContextValue = {
  imageLoadingStatus: ImageLoadingStatus
  onImageLoadingStatusChange(status: ImageLoadingStatus): void
}

const [AvatarProvider, useAvatarContext] =
  createAvatarContext<AvatarContextValue>(AVATAR_NAME)

type AvatarElement = ElementRef<typeof Primitive.span>
interface AvatarProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}

/**
 * Avatar displays a user image with a fallback for when the image fails to load.
 *
 * @example
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="..." alt="..." />
 *   <AvatarFallback>JD</AvatarFallback>
 * </Avatar>
 * ```
 */
const Avatar = forwardRef<AvatarElement, ScopedProps<AvatarProps>>(
  (props, forwardedRef) => {
    const { __scopeAvatar, ...avatarProps } = props
    const [imageLoadingStatus, setImageLoadingStatus] =
      useState<ImageLoadingStatus>('idle')

    return (
      <AvatarProvider
        scope={__scopeAvatar}
        imageLoadingStatus={imageLoadingStatus}
        onImageLoadingStatusChange={setImageLoadingStatus}
      >
        <Primitive.span {...avatarProps} ref={forwardedRef} />
      </AvatarProvider>
    )
  }
)

Avatar.displayName = AVATAR_NAME

/* -------------------------------------------------------------------------------------------------
 * AvatarImage
 * -----------------------------------------------------------------------------------------------*/

const IMAGE_NAME = 'AvatarImage'

type AvatarImageElement = ElementRef<typeof Primitive.img>
interface AvatarImageProps extends ComponentPropsWithoutRef<typeof Primitive.img> {
  /**
   * A callback for when the image fails to load.
   */
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void
}

const AvatarImage = forwardRef<AvatarImageElement, ScopedProps<AvatarImageProps>>(
  (props, forwardedRef) => {
    const { __scopeAvatar, src, onLoadingStatusChange = () => {}, ...imageProps } = props
    const context = useAvatarContext(IMAGE_NAME, __scopeAvatar)
    const imageLoadingStatus = useImageLoadingStatus(src)

    const handleLoadingStatusChange = useCallback(
      (status: ImageLoadingStatus) => {
        onLoadingStatusChange(status)
        context.onImageLoadingStatusChange(status)
      },
      [onLoadingStatusChange, context]
    )

    useLayoutEffect(() => {
      if (imageLoadingStatus !== 'idle') {
        handleLoadingStatusChange(imageLoadingStatus)
      }
    }, [imageLoadingStatus, handleLoadingStatusChange])

    return imageLoadingStatus === 'loaded' ? (
      <Primitive.img {...imageProps} ref={forwardedRef} src={src} />
    ) : null
  }
)

AvatarImage.displayName = IMAGE_NAME

/* -------------------------------------------------------------------------------------------------
 * AvatarFallback
 * -----------------------------------------------------------------------------------------------*/

const FALLBACK_NAME = 'AvatarFallback'

type AvatarFallbackElement = ElementRef<typeof Primitive.span>
interface AvatarFallbackProps extends ComponentPropsWithoutRef<typeof Primitive.span> {
  /**
   * Delay in milliseconds before the fallback is shown.
   * This is useful to avoid rendering the fallback during a brief loading state.
   */
  delayMs?: number
}

const AvatarFallback = forwardRef<
  AvatarFallbackElement,
  ScopedProps<AvatarFallbackProps>
>((props, forwardedRef) => {
  const { __scopeAvatar, delayMs, ...fallbackProps } = props
  const context = useAvatarContext(FALLBACK_NAME, __scopeAvatar)
  const [canRender, setCanRender] = useState(delayMs === undefined)

  useEffect(() => {
    if (delayMs !== undefined) {
      const timerId = window.setTimeout(() => setCanRender(true), delayMs)
      return () => window.clearTimeout(timerId)
    }
    return undefined
  }, [delayMs])

  return canRender && context.imageLoadingStatus !== 'loaded' ? (
    <Primitive.span {...fallbackProps} ref={forwardedRef} />
  ) : null
})

AvatarFallback.displayName = FALLBACK_NAME

/* -------------------------------------------------------------------------------------------------
 * useImageLoadingStatus
 * -----------------------------------------------------------------------------------------------*/

function useImageLoadingStatus(src?: string) {
  const [loadingStatus, setLoadingStatus] = useState<ImageLoadingStatus>('idle')

  useLayoutEffect(() => {
    if (!src) {
      setLoadingStatus('error')
      return
    }

    let isMounted = true
    const image = new window.Image()

    const updateStatus = (status: ImageLoadingStatus) => () => {
      if (!isMounted) return
      setLoadingStatus(status)
    }

    setLoadingStatus('loading')
    image.onload = updateStatus('loaded')
    image.onerror = updateStatus('error')
    image.src = src

    return () => {
      isMounted = false
    }
  }, [src])

  return loadingStatus
}

/* ---------------------------------------------------------------------------------------------- */

const Root = Avatar
const Image = AvatarImage
const Fallback = AvatarFallback

export {
  createAvatarScope,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Root,
  Image,
  Fallback,
}
export type { AvatarProps, AvatarImageProps, AvatarFallbackProps }
