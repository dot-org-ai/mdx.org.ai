import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

/* -------------------------------------------------------------------------------------------------
 * Progress
 * -----------------------------------------------------------------------------------------------*/

const PROGRESS_NAME = 'Progress'

type ScopedProps<P> = P & { __scopeProgress?: Scope }
const [createProgressContext, createProgressScope] = createContextScope(PROGRESS_NAME)

type ProgressState = 'indeterminate' | 'complete' | 'loading'

type ProgressContextValue = {
  value: number | null
  max: number
}

const [ProgressProvider, useProgressContext] =
  createProgressContext<ProgressContextValue>(PROGRESS_NAME)

type ProgressElement = ElementRef<typeof Primitive.div>
interface ProgressProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * The current progress value. Set to `null` for indeterminate progress.
   */
  value?: number | null
  /**
   * The maximum progress value.
   * @default 100
   */
  max?: number
  /**
   * A function to get the accessible label text representing the current value.
   * If not provided, the value label will be read as the numeric value as a percentage.
   */
  getValueLabel?(value: number, max: number): string
}

/**
 * Progress displays an indicator showing the completion progress of a task.
 *
 * @example
 * ```tsx
 * <Progress value={33}>
 *   <ProgressIndicator style={{ transform: `translateX(-${100 - 33}%)` }} />
 * </Progress>
 * ```
 */
const Progress = forwardRef<ProgressElement, ScopedProps<ProgressProps>>(
  (props, forwardedRef) => {
    const {
      __scopeProgress,
      value: valueProp,
      max: maxProp,
      getValueLabel = defaultGetValueLabel,
      ...progressProps
    } = props

    const max = isValidMaxNumber(maxProp) ? maxProp : DEFAULT_MAX
    const value = isValidValueNumber(valueProp, max) ? valueProp : null
    const valueLabel = isNumber(value) ? getValueLabel(value, max) : undefined

    return (
      <ProgressProvider scope={__scopeProgress} value={value} max={max}>
        <Primitive.div
          aria-valuemax={max}
          aria-valuemin={0}
          aria-valuenow={isNumber(value) ? value : undefined}
          aria-valuetext={valueLabel}
          role="progressbar"
          data-state={getProgressState(value, max)}
          data-value={value ?? undefined}
          data-max={max}
          {...progressProps}
          ref={forwardedRef}
        />
      </ProgressProvider>
    )
  }
)

Progress.displayName = PROGRESS_NAME

/* -------------------------------------------------------------------------------------------------
 * ProgressIndicator
 * -----------------------------------------------------------------------------------------------*/

const INDICATOR_NAME = 'ProgressIndicator'

type ProgressIndicatorElement = ElementRef<typeof Primitive.div>
interface ProgressIndicatorProps
  extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const ProgressIndicator = forwardRef<
  ProgressIndicatorElement,
  ScopedProps<ProgressIndicatorProps>
>((props, forwardedRef) => {
  const { __scopeProgress, ...indicatorProps } = props
  const context = useProgressContext(INDICATOR_NAME, __scopeProgress)
  return (
    <Primitive.div
      data-state={getProgressState(context.value, context.max)}
      data-value={context.value ?? undefined}
      data-max={context.max}
      {...indicatorProps}
      ref={forwardedRef}
    />
  )
})

ProgressIndicator.displayName = INDICATOR_NAME

/* ---------------------------------------------------------------------------------------------- */

function defaultGetValueLabel(value: number, max: number) {
  return `${Math.round((value / max) * 100)}%`
}

function getProgressState(value: number | undefined | null, max: number): ProgressState {
  return value == null ? 'indeterminate' : value === max ? 'complete' : 'loading'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

function isValidMaxNumber(max: unknown): max is number {
  return isNumber(max) && !isNaN(max) && max > 0
}

function isValidValueNumber(value: unknown, max: number): value is number {
  return isNumber(value) && !isNaN(value) && value <= max && value >= 0
}

const DEFAULT_MAX = 100

const Root = Progress
const Indicator = ProgressIndicator

export {
  createProgressScope,
  Progress,
  ProgressIndicator,
  Root,
  Indicator,
}
export type { ProgressProps, ProgressIndicatorProps }
