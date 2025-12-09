/**
 * @mdxui/headless - Transition component
 * A headless transition component for animations
 * API compatible with @headlessui/react Transition
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

type TransitionStage = 'enter' | 'leave' | 'idle'
type TransitionPhase = 'from' | 'to' | 'done'

interface TransitionContextValue {
  show: boolean
  appear: boolean
}

const TransitionContext = createContext<TransitionContextValue | null>(null)

interface TransitionClasses {
  enter?: string
  enterFrom?: string
  enterTo?: string
  entered?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string
}

/* -------------------------------------------------------------------------------------------------
 * useTransition Hook
 * -----------------------------------------------------------------------------------------------*/

function useTransition({
  show,
  appear = false,
  beforeEnter,
  afterEnter,
  beforeLeave,
  afterLeave,
}: {
  show: boolean
  appear?: boolean
  beforeEnter?: () => void
  afterEnter?: () => void
  beforeLeave?: () => void
  afterLeave?: () => void
}) {
  const [stage, setStage] = useState<TransitionStage>(show ? 'idle' : 'idle')
  const [phase, setPhase] = useState<TransitionPhase>('done')
  const [shouldRender, setShouldRender] = useState(show)
  const initialRender = useRef(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    // Handle initial appear
    if (initialRender.current) {
      initialRender.current = false
      if (show && appear) {
        setShouldRender(true)
        setStage('enter')
        setPhase('from')
        beforeEnter?.()

        // Trigger reflow then transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (mounted.current) {
              setPhase('to')
            }
          })
        })
      } else if (show) {
        setShouldRender(true)
        setStage('idle')
        setPhase('done')
      }
      return
    }

    // Handle show/hide transitions
    if (show) {
      setShouldRender(true)
      setStage('enter')
      setPhase('from')
      beforeEnter?.()

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mounted.current) {
            setPhase('to')
          }
        })
      })
    } else {
      setStage('leave')
      setPhase('from')
      beforeLeave?.()

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mounted.current) {
            setPhase('to')
          }
        })
      })
    }
  }, [show, appear, beforeEnter, beforeLeave])

  const handleTransitionEnd = useCallback(() => {
    if (stage === 'enter') {
      setStage('idle')
      setPhase('done')
      afterEnter?.()
    } else if (stage === 'leave') {
      setStage('idle')
      setPhase('done')
      setShouldRender(false)
      afterLeave?.()
    }
  }, [stage, afterEnter, afterLeave])

  return {
    stage,
    phase,
    shouldRender,
    handleTransitionEnd,
  }
}

/* -------------------------------------------------------------------------------------------------
 * getTransitionClasses
 * -----------------------------------------------------------------------------------------------*/

function getTransitionClasses(
  classes: TransitionClasses,
  stage: TransitionStage,
  phase: TransitionPhase
): string {
  const classList: string[] = []

  if (stage === 'enter') {
    if (classes.enter) classList.push(classes.enter)
    if (phase === 'from' && classes.enterFrom) classList.push(classes.enterFrom)
    if (phase === 'to' && classes.enterTo) classList.push(classes.enterTo)
  } else if (stage === 'leave') {
    if (classes.leave) classList.push(classes.leave)
    if (phase === 'from' && classes.leaveFrom) classList.push(classes.leaveFrom)
    if (phase === 'to' && classes.leaveTo) classList.push(classes.leaveTo)
  } else if (stage === 'idle' && phase === 'done') {
    if (classes.entered) classList.push(classes.entered)
  }

  return classList.join(' ')
}

/* -------------------------------------------------------------------------------------------------
 * Transition Root
 * -----------------------------------------------------------------------------------------------*/

type TransitionElement = ElementRef<typeof Primitive.div>
interface TransitionRootProps extends ComponentPropsWithoutRef<typeof Primitive.div>, TransitionClasses {
  show?: boolean
  appear?: boolean
  unmount?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  beforeEnter?: () => void
  afterEnter?: () => void
  beforeLeave?: () => void
  afterLeave?: () => void
  children?: ReactNode
}

const TransitionRoot = forwardRef<TransitionElement, TransitionRootProps>(
  (
    {
      children,
      show: controlledShow,
      appear = false,
      unmount = true,
      enter,
      enterFrom,
      enterTo,
      entered,
      leave,
      leaveFrom,
      leaveTo,
      beforeEnter,
      afterEnter,
      beforeLeave,
      afterLeave,
      className,
      ...props
    },
    ref
  ) => {
    // Check if we're nested inside another Transition
    const parentContext = useContext(TransitionContext)
    const show = controlledShow ?? parentContext?.show ?? false
    const shouldAppear = appear || (parentContext?.appear ?? false)

    const { stage, phase, shouldRender, handleTransitionEnd } = useTransition({
      show,
      appear: shouldAppear,
      beforeEnter,
      afterEnter,
      beforeLeave,
      afterLeave,
    })

    const transitionClasses = getTransitionClasses(
      { enter, enterFrom, enterTo, entered, leave, leaveFrom, leaveTo },
      stage,
      phase
    )

    const contextValue = useMemo(
      () => ({
        show,
        appear: shouldAppear,
      }),
      [show, shouldAppear]
    )

    if (!shouldRender && unmount) {
      return null
    }

    const combinedClassName = [className, transitionClasses].filter(Boolean).join(' ')

    return (
      <TransitionContext.Provider value={contextValue}>
        <Primitive.div
          ref={ref}
          className={combinedClassName || undefined}
          data-headlessui-state={show ? 'open' : 'closed'}
          data-transition-stage={stage}
          data-transition-phase={phase}
          hidden={!shouldRender && !unmount ? true : undefined}
          onTransitionEnd={handleTransitionEnd}
          {...props}
        >
          {children}
        </Primitive.div>
      </TransitionContext.Provider>
    )
  }
)
TransitionRoot.displayName = 'Transition'

/* -------------------------------------------------------------------------------------------------
 * Transition Child
 * -----------------------------------------------------------------------------------------------*/

type TransitionChildElement = ElementRef<typeof Primitive.div>
interface TransitionChildProps extends ComponentPropsWithoutRef<typeof Primitive.div>, TransitionClasses {
  appear?: boolean
  unmount?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  beforeEnter?: () => void
  afterEnter?: () => void
  beforeLeave?: () => void
  afterLeave?: () => void
  children?: ReactNode
}

const TransitionChild = forwardRef<TransitionChildElement, TransitionChildProps>(
  (
    {
      children,
      appear = false,
      unmount = true,
      enter,
      enterFrom,
      enterTo,
      entered,
      leave,
      leaveFrom,
      leaveTo,
      beforeEnter,
      afterEnter,
      beforeLeave,
      afterLeave,
      className,
      ...props
    },
    ref
  ) => {
    const context = useContext(TransitionContext)
    if (!context) {
      throw new Error('<Transition.Child /> must be used within <Transition />')
    }

    const { stage, phase, shouldRender, handleTransitionEnd } = useTransition({
      show: context.show,
      appear: appear || context.appear,
      beforeEnter,
      afterEnter,
      beforeLeave,
      afterLeave,
    })

    const transitionClasses = getTransitionClasses(
      { enter, enterFrom, enterTo, entered, leave, leaveFrom, leaveTo },
      stage,
      phase
    )

    if (!shouldRender && unmount) {
      return null
    }

    const combinedClassName = [className, transitionClasses].filter(Boolean).join(' ')

    return (
      <Primitive.div
        ref={ref}
        className={combinedClassName || undefined}
        data-headlessui-state={context.show ? 'open' : 'closed'}
        data-transition-stage={stage}
        data-transition-phase={phase}
        hidden={!shouldRender && !unmount ? true : undefined}
        onTransitionEnd={handleTransitionEnd}
        {...props}
      >
        {children}
      </Primitive.div>
    )
  }
)
TransitionChild.displayName = 'TransitionChild'

/* -------------------------------------------------------------------------------------------------
 * CloseButton (utility for closing dialogs/popovers from within Transition)
 * -----------------------------------------------------------------------------------------------*/

type CloseButtonElement = ElementRef<typeof Primitive.button>
interface CloseButtonProps extends ComponentPropsWithoutRef<typeof Primitive.button> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const CloseButton = forwardRef<CloseButtonElement, CloseButtonProps>((props, ref) => {
  return (
    <Primitive.button
      ref={ref}
      type="button"
      {...props}
    />
  )
})
CloseButton.displayName = 'CloseButton'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Transition = Object.assign(TransitionRoot, {
  Child: TransitionChild,
  Root: TransitionRoot,
})

export { Transition, TransitionChild, CloseButton }
export type { TransitionRootProps, TransitionChildProps, CloseButtonProps }
