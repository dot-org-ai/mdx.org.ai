/**
 * List components - Ordered and unordered lists
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * List
 * -----------------------------------------------------------------------------------------------*/

type ListElement = HTMLUListElement
interface ListProps extends ComponentPropsWithoutRef<'ul'> {}

const List = forwardRef<ListElement, ListProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Primitive.ul
        ref={ref}
        className={`space-y-2 ${className}`.trim()}
        {...props}
      />
    )
  }
)
List.displayName = 'List'

/* -------------------------------------------------------------------------------------------------
 * ListItem
 * -----------------------------------------------------------------------------------------------*/

type ListItemElement = HTMLLIElement
interface ListItemProps extends ComponentPropsWithoutRef<'li'> {}

const ListItem = forwardRef<ListItemElement, ListItemProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Primitive.li
        ref={ref}
        className={`flex items-center justify-between py-2 ${className}`.trim()}
        {...props}
      />
    )
  }
)
ListItem.displayName = 'ListItem'

export { List, ListItem }
export type { ListProps, ListItemProps }
