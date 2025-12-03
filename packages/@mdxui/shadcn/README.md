# @mdxui/shadcn

Shadcn/ui components with tweakcn theme presets for MDX applications. A comprehensive component library built on Radix UI primitives.

## Installation

```bash
npm install @mdxui/shadcn
# or
pnpm add @mdxui/shadcn
# or
yarn add @mdxui/shadcn
```

## Features

- **50+ Components** - Complete UI component library
- **Theme Presets** - Pre-built themes via tweakcn
- **Radix Primitives** - Built on accessible Radix UI
- **Tailwind CSS** - Fully styled with Tailwind
- **Mobile Responsive** - Works on all screen sizes
- **Type-Safe** - Full TypeScript support

## Quick Start

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle } from '@mdxui/shadcn'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Hello from MDX!</p>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## Components

### Layout

| Component | Description |
|-----------|-------------|
| `Card` | Container with header, content, footer |
| `Separator` | Visual divider |
| `ScrollArea` | Custom scrollable area |
| `Resizable` | Resizable panels |
| `AspectRatio` | Maintain aspect ratios |
| `Collapsible` | Expandable content |

### Navigation

| Component | Description |
|-----------|-------------|
| `NavigationMenu` | Top-level navigation |
| `Menubar` | Application menu bar |
| `Breadcrumb` | Page navigation trail |
| `Tabs` | Tabbed content |
| `Pagination` | Page navigation |
| `Sidebar` | Side navigation panel |

### Forms

| Component | Description |
|-----------|-------------|
| `Button` | Primary action button |
| `Input` | Text input field |
| `Textarea` | Multi-line text input |
| `Select` | Dropdown selection |
| `Checkbox` | Boolean selection |
| `RadioGroup` | Single selection from options |
| `Switch` | Toggle switch |
| `Slider` | Range selection |
| `Calendar` | Date picker calendar |
| `Form` | Form wrapper with validation |
| `Label` | Form field labels |
| `InputOTP` | One-time password input |

### Feedback

| Component | Description |
|-----------|-------------|
| `Alert` | Informational messages |
| `AlertDialog` | Confirmation dialogs |
| `Dialog` | Modal dialogs |
| `Drawer` | Slide-in panels |
| `Sheet` | Side panel overlay |
| `Progress` | Progress indicator |
| `Skeleton` | Loading placeholder |
| `Spinner` | Loading spinner |
| `Sonner` | Toast notifications |
| `Tooltip` | Hover information |

### Data Display

| Component | Description |
|-----------|-------------|
| `Table` | Data tables |
| `Avatar` | User avatars |
| `Badge` | Status badges |
| `Carousel` | Image/content slider |
| `Chart` | Data visualization |
| `HoverCard` | Hover content cards |

### Overlays

| Component | Description |
|-----------|-------------|
| `Popover` | Click-triggered overlay |
| `DropdownMenu` | Dropdown actions menu |
| `ContextMenu` | Right-click menu |
| `Command` | Command palette |

### Utilities

| Component | Description |
|-----------|-------------|
| `Accordion` | Expandable sections |
| `Toggle` | Toggle button |
| `ToggleGroup` | Toggle button group |
| `ButtonGroup` | Button group |
| `Kbd` | Keyboard key display |
| `Empty` | Empty state placeholder |

## Component Examples

### Button

```tsx
import { Button } from '@mdxui/shadcn'

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🚀</Button>

// With loading
<Button disabled>
  <Spinner className="mr-2 h-4 w-4" />
  Loading
</Button>
```

### Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@mdxui/shadcn'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content of the card.</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@mdxui/shadcn'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Continue</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form

```tsx
import { useForm } from 'react-hook-form'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
  Button
} from '@mdxui/shadcn'

function MyForm() {
  const form = useForm()

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll never share your email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### Table

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@mdxui/shadcn'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Alice</TableCell>
      <TableCell>alice@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Command

```tsx
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '@mdxui/shadcn'

<Command>
  <CommandInput placeholder="Type a command..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Calendar</CommandItem>
      <CommandItem>Search</CommandItem>
      <CommandItem>Settings</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### Sidebar

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from '@mdxui/shadcn'

<Sidebar>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Application</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/">Home</a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/settings">Settings</a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </SidebarContent>
</Sidebar>
```

## Theming

### Using Theme Presets

```tsx
import { themes, applyTheme } from '@mdxui/shadcn'

// Apply a theme
applyTheme(themes.dark)
applyTheme(themes.light)
applyTheme(themes.blue)
```

### Custom Themes

```tsx
import { createTheme } from '@mdxui/shadcn'

const customTheme = createTheme({
  background: '0 0% 100%',
  foreground: '222.2 84% 4.9%',
  primary: '221.2 83.2% 53.3%',
  primaryForeground: '210 40% 98%',
  // ... more variables
})

applyTheme(customTheme)
```

### CSS Variables

The components use CSS custom properties for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

## Utilities

### cn() - Class Name Merger

```tsx
import { cn } from '@mdxui/shadcn'

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' ? 'primary' : 'secondary'
)} />
```

### useIsMobile() Hook

```tsx
import { useIsMobile } from '@mdxui/shadcn'

function ResponsiveComponent() {
  const isMobile = useIsMobile()

  return isMobile ? <MobileView /> : <DesktopView />
}
```

## Tailwind Configuration

Add to your `tailwind.config.js`:

```js
module.exports = {
  content: [
    './node_modules/@mdxui/shadcn/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      // Theme extensions from @mdxui/shadcn
    }
  },
  plugins: [
    require('tailwindcss-animate')
  ]
}
```

## Types

All components export their prop types:

```tsx
import type {
  ButtonProps,
  CardProps,
  DialogProps,
  InputProps,
  // ... etc
} from '@mdxui/shadcn'
```

## Related Packages

| Package | Description |
|---------|-------------|
| [@mdxui/widgets](https://www.npmjs.com/package/@mdxui/widgets) | Advanced widgets |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [tailwindcss](https://www.npmjs.com/package/tailwindcss) | CSS framework |
| [@radix-ui/react-*](https://www.radix-ui.com) | Primitive components |

## License

MIT
