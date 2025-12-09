/**
 * Accordion - Expandable content sections using @mdxui/headless
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@mdxui/headless'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Accordion (single item - uses Disclosure)
 * For multi-accordion, compose multiple Disclosures
 * -----------------------------------------------------------------------------------------------*/

export { Disclosure as Accordion }

/* -------------------------------------------------------------------------------------------------
 * AccordionHeader
 * -----------------------------------------------------------------------------------------------*/

type AccordionHeaderElement = HTMLButtonElement
interface AccordionHeaderProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children?: React.ReactNode
}

const AccordionHeader = forwardRef<AccordionHeaderElement, AccordionHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <DisclosureButton
        ref={ref}
        className={`flex w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-open]>svg]:rotate-180 ${className}`.trim()}
        {...props}
      >
        {children}
        <svg
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </DisclosureButton>
    )
  }
)
AccordionHeader.displayName = 'AccordionHeader'

/* -------------------------------------------------------------------------------------------------
 * AccordionBody
 * -----------------------------------------------------------------------------------------------*/

type AccordionBodyElement = HTMLDivElement
interface AccordionBodyProps extends ComponentPropsWithoutRef<'div'> {}

const AccordionBody = forwardRef<AccordionBodyElement, AccordionBodyProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <DisclosurePanel
        ref={ref}
        className={`overflow-hidden text-sm transition-all ${className}`.trim()}
        {...props}
      />
    )
  }
)
AccordionBody.displayName = 'AccordionBody'

/* -------------------------------------------------------------------------------------------------
 * AccordionList - Container for multiple accordions
 * -----------------------------------------------------------------------------------------------*/

type AccordionListElement = HTMLDivElement
interface AccordionListProps extends ComponentPropsWithoutRef<'div'> {}

const AccordionList = forwardRef<AccordionListElement, AccordionListProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        className={`divide-y divide-border rounded-md border ${className}`.trim()}
        {...props}
      />
    )
  }
)
AccordionList.displayName = 'AccordionList'

export { AccordionHeader, AccordionBody, AccordionList }
export type { AccordionHeaderProps, AccordionBodyProps, AccordionListProps }
