/**
 * @mdxui/headless - Headless UI primitives with React/Hono JSX runtime support
 * A port of @headlessui/react for multi-runtime JSX compatibility
 */

// Disclosure & Expansion
export {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  type DisclosureProps,
  type DisclosureButtonProps,
  type DisclosurePanelProps,
} from './components/disclosure'

export {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  type DialogProps,
  type DialogBackdropProps,
  type DialogPanelProps,
  type DialogTitleProps,
  type DialogDescriptionProps,
} from './components/dialog'

export {
  Popover,
  PopoverButton,
  PopoverBackdrop,
  PopoverPanel,
  PopoverGroup,
  type PopoverProps,
  type PopoverButtonProps,
  type PopoverBackdropProps,
  type PopoverPanelProps,
  type PopoverGroupProps,
} from './components/popover'

// Navigation & Selection
export {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  MenuSection,
  MenuHeading,
  MenuSeparator,
  type MenuProps,
  type MenuButtonProps,
  type MenuItemsProps,
  type MenuItemProps,
  type MenuSectionProps,
  type MenuHeadingProps,
  type MenuSeparatorProps,
} from './components/menu'

export {
  Listbox,
  ListboxLabel,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  ListboxSelectedOption,
  type ListboxProps,
  type ListboxLabelProps,
  type ListboxButtonProps,
  type ListboxOptionsProps,
  type ListboxOptionProps,
  type ListboxSelectedOptionProps,
} from './components/listbox'

export {
  Combobox,
  ComboboxLabel,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  type ComboboxProps,
  type ComboboxLabelProps,
  type ComboboxInputProps,
  type ComboboxButtonProps,
  type ComboboxOptionsProps,
  type ComboboxOptionProps,
} from './components/combobox'

export {
  Tab,
  TabGroup,
  TabList,
  TabPanels,
  TabPanel,
  type TabGroupProps,
  type TabListProps,
  type TabProps,
  type TabPanelsProps,
  type TabPanelProps,
} from './components/tabs'

// Form Controls
export {
  Switch,
  SwitchGroup,
  SwitchLabel,
  SwitchDescription,
  type SwitchProps,
  type SwitchGroupProps,
  type SwitchLabelProps,
  type SwitchDescriptionProps,
} from './components/switch'

export {
  Checkbox,
  CheckboxGroup,
  CheckboxLabel,
  CheckboxDescription,
  type CheckboxProps,
  type CheckboxGroupProps,
  type CheckboxLabelProps,
  type CheckboxDescriptionProps,
} from './components/checkbox'

export {
  RadioGroup,
  Radio,
  RadioGroupLabel,
  RadioGroupDescription,
  RadioGroupOption,
  type RadioGroupProps,
  type RadioGroupLabelProps,
  type RadioGroupDescriptionProps,
  type RadioGroupOptionProps,
} from './components/radio-group'

export {
  Button,
  type ButtonProps,
} from './components/button'

export {
  Input,
  type InputProps,
} from './components/input'

export {
  Textarea,
  type TextareaProps,
} from './components/textarea'

export {
  Select,
  type SelectProps,
} from './components/select'

export {
  Fieldset,
  Legend,
  Field,
  type FieldsetProps,
  type LegendProps,
  type FieldProps,
} from './components/field'

export {
  Label,
  type LabelProps,
} from './components/label'

export {
  Description,
  type DescriptionProps,
} from './components/description'

// Animation
export {
  Transition,
  TransitionChild,
  CloseButton,
  type TransitionRootProps,
  type TransitionChildProps,
  type CloseButtonProps,
} from './components/transition'
