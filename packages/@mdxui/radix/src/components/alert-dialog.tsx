/**
 * @mdxui/radix - AlertDialog
 * A modal dialog that interrupts the user with important content.
 * Built on top of Dialog.
 */

export * from './dialog'
export { Dialog as AlertDialog, DialogTrigger as AlertDialogTrigger, DialogPortal as AlertDialogPortal, DialogOverlay as AlertDialogOverlay, DialogContent as AlertDialogContent, DialogTitle as AlertDialogTitle, DialogDescription as AlertDialogDescription, DialogClose as AlertDialogCancel } from './dialog'

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose, type DialogCloseProps } from './dialog'

type AlertDialogActionElement = ElementRef<typeof Primitive.button>
interface AlertDialogActionProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}

const AlertDialogAction = forwardRef<AlertDialogActionElement, AlertDialogActionProps>(
  (props, forwardedRef) => <DialogClose {...props} ref={forwardedRef} />
)
AlertDialogAction.displayName = 'AlertDialogAction'

// Main named exports
export { AlertDialogAction }
export type { AlertDialogActionProps }

// Also export as short names for namespace pattern compatibility (AlertDialogPrimitive.Action)
export { AlertDialogAction as Action }
export { DialogClose as Cancel }
export { Dialog as Root }
export { DialogTrigger as Trigger }
export { DialogPortal as Portal }
export { DialogOverlay as Overlay }
export { DialogContent as Content }
export { DialogTitle as Title }
export { DialogDescription as Description }
