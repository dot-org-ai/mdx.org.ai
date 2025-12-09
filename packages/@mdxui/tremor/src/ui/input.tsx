/**
 * Input components - Text inputs and search
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Input as HeadlessInput, Textarea as HeadlessTextarea } from '@mdxui/headless'

/* -------------------------------------------------------------------------------------------------
 * TextInput
 * -----------------------------------------------------------------------------------------------*/

type TextInputElement = HTMLInputElement
interface TextInputProps extends ComponentPropsWithoutRef<'input'> {
  /** Input icon */
  icon?: React.ComponentType<{ className?: string }>
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
}

const TextInput = forwardRef<TextInputElement, TextInputProps>(
  ({ className = '', icon: Icon, error, errorMessage, ...props }, ref) => {
    return (
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <HeadlessInput
          ref={ref}
          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500' : ''} ${className}`.trim()}
          invalid={error}
          {...props}
        />
        {error && errorMessage && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    )
  }
)
TextInput.displayName = 'TextInput'

/* -------------------------------------------------------------------------------------------------
 * NumberInput
 * -----------------------------------------------------------------------------------------------*/

type NumberInputElement = HTMLInputElement
interface NumberInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  /** Enable stepper buttons */
  enableStepper?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
}

const NumberInput = forwardRef<NumberInputElement, NumberInputProps>(
  ({ className = '', enableStepper = true, error, errorMessage, ...props }, ref) => {
    return (
      <div className="relative">
        <HeadlessInput
          ref={ref}
          type="number"
          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${!enableStepper ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''} ${error ? 'border-red-500' : ''} ${className}`.trim()}
          invalid={error}
          {...props}
        />
        {error && errorMessage && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    )
  }
)
NumberInput.displayName = 'NumberInput'

/* -------------------------------------------------------------------------------------------------
 * SearchInput (SearchSelect in Tremor)
 * -----------------------------------------------------------------------------------------------*/

type SearchInputElement = HTMLInputElement
interface SearchInputProps extends ComponentPropsWithoutRef<'input'> {
  /** Placeholder */
  placeholder?: string
  /** On clear callback */
  onClear?: () => void
}

const SearchInput = forwardRef<SearchInputElement, SearchInputProps>(
  ({ className = '', placeholder = 'Search...', value, onClear, ...props }, ref) => {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <HeadlessInput
          ref={ref}
          type="search"
          placeholder={placeholder}
          value={value}
          className={`flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'

/* -------------------------------------------------------------------------------------------------
 * Textarea
 * -----------------------------------------------------------------------------------------------*/

type TextareaElement = HTMLTextAreaElement
interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
}

const Textarea = forwardRef<TextareaElement, TextareaProps>(
  ({ className = '', error, errorMessage, ...props }, ref) => {
    return (
      <div>
        <HeadlessTextarea
          ref={ref}
          className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500' : ''} ${className}`.trim()}
          invalid={error}
          {...props}
        />
        {error && errorMessage && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { TextInput, NumberInput, SearchInput, Textarea }
export type { TextInputProps, NumberInputProps, SearchInputProps, TextareaProps }
