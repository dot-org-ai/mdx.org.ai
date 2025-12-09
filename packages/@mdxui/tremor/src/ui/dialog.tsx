/**
 * Dialog - Modal dialog component using @mdxui/headless
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import {
  Dialog as HeadlessDialog,
  DialogPanel as HeadlessDialogPanel,
  DialogTitle as HeadlessDialogTitle,
  DialogBackdrop,
} from '@mdxui/headless'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Dialog
 * -----------------------------------------------------------------------------------------------*/

export { HeadlessDialog as Dialog, DialogBackdrop }

/* -------------------------------------------------------------------------------------------------
 * DialogPanel
 * -----------------------------------------------------------------------------------------------*/

type DialogPanelElement = HTMLDivElement
interface DialogPanelProps extends ComponentPropsWithoutRef<'div'> {}

const DialogPanel = forwardRef<DialogPanelElement, DialogPanelProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <HeadlessDialogPanel
        ref={ref}
        className={`relative transform overflow-hidden rounded-lg bg-background p-6 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${className}`.trim()}
        {...props}
      />
    )
  }
)
DialogPanel.displayName = 'DialogPanel'

/* -------------------------------------------------------------------------------------------------
 * DialogTitle
 * -----------------------------------------------------------------------------------------------*/

type DialogTitleElement = HTMLHeadingElement
interface DialogTitleProps extends ComponentPropsWithoutRef<'h3'> {}

const DialogTitle = forwardRef<DialogTitleElement, DialogTitleProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <HeadlessDialogTitle
        ref={ref}
        className={`text-lg font-medium leading-6 ${className}`.trim()}
        {...props}
      />
    )
  }
)
DialogTitle.displayName = 'DialogTitle'

/* -------------------------------------------------------------------------------------------------
 * DialogDescription
 * -----------------------------------------------------------------------------------------------*/

type DialogDescriptionElement = HTMLParagraphElement
interface DialogDescriptionProps extends ComponentPropsWithoutRef<'p'> {}

const DialogDescription = forwardRef<DialogDescriptionElement, DialogDescriptionProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Primitive.p
        ref={ref}
        className={`mt-2 text-sm text-muted-foreground ${className}`.trim()}
        {...props}
      />
    )
  }
)
DialogDescription.displayName = 'DialogDescription'

/* -------------------------------------------------------------------------------------------------
 * DialogFooter
 * -----------------------------------------------------------------------------------------------*/

type DialogFooterElement = HTMLDivElement
interface DialogFooterProps extends ComponentPropsWithoutRef<'div'> {}

const DialogFooter = forwardRef<DialogFooterElement, DialogFooterProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        className={`mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`.trim()}
        {...props}
      />
    )
  }
)
DialogFooter.displayName = 'DialogFooter'

export { DialogPanel, DialogTitle, DialogDescription, DialogFooter }
export type { DialogPanelProps, DialogTitleProps, DialogDescriptionProps, DialogFooterProps }
