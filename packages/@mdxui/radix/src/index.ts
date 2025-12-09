/**
 * @mdxui/radix - Radix UI primitives with React/Hono JSX runtime support
 *
 * This package provides Radix UI primitive components that work with both
 * React and Hono JSX runtimes. The runtime is selected at build time via
 * package.json conditional exports.
 *
 * @example
 * ```tsx
 * import * as Dialog from '@mdxui/radix/components/dialog'
 * import * as Tabs from '@mdxui/radix/components/tabs'
 *
 * // Or import namespaces from main package
 * import { Dialog, Tabs } from '@mdxui/radix'
 * ```
 *
 * @packageDocumentation
 */

// Namespace exports for all components
import * as Separator from './components/separator'
import * as Label from './components/label'
import * as AspectRatio from './components/aspect-ratio'
import * as VisuallyHidden from './components/visually-hidden'
import * as Progress from './components/progress'
import * as Checkbox from './components/checkbox'
import * as Switch from './components/switch'
import * as Toggle from './components/toggle'
import * as ToggleGroup from './components/toggle-group'
import * as Collapsible from './components/collapsible'
import * as Accordion from './components/accordion'
import * as Tabs from './components/tabs'
import * as Slider from './components/slider'
import * as RadioGroup from './components/radio-group'
import * as Avatar from './components/avatar'
import * as ScrollArea from './components/scroll-area'
import * as Dialog from './components/dialog'
import * as DropdownMenu from './components/dropdown-menu'
import * as ContextMenu from './components/context-menu'
import * as Select from './components/select'
import * as Popover from './components/popover'
import * as Tooltip from './components/tooltip'
import * as HoverCard from './components/hover-card'
import * as NavigationMenu from './components/navigation-menu'
import * as Menubar from './components/menubar'
import * as AlertDialog from './components/alert-dialog'

export {
  Separator,
  Label,
  AspectRatio,
  VisuallyHidden,
  Progress,
  Checkbox,
  Switch,
  Toggle,
  ToggleGroup,
  Collapsible,
  Accordion,
  Tabs,
  Slider,
  RadioGroup,
  Avatar,
  ScrollArea,
  Dialog,
  DropdownMenu,
  ContextMenu,
  Select,
  Popover,
  Tooltip,
  HoverCard,
  NavigationMenu,
  Menubar,
  AlertDialog,
}

// Re-export utilities
export { RemoveScroll, useRemoveScroll } from './scroll-lock'
export { hideOthers, inertOthers } from './utils/aria-hidden'
