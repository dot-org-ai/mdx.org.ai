import type { Meta, StoryObj } from '@storybook/react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@mdxui/shadcn'

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles that matches the other components' aesthetic.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>
          Yes. It's animated by default, but you can disable it if you prefer.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Can I open multiple?</AccordionTrigger>
        <AccordionContent>
          Yes. Set type="multiple" to allow multiple items to be open at once.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How does it work?</AccordionTrigger>
        <AccordionContent>
          Each item maintains its own open/closed state independently.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>What are the use cases?</AccordionTrigger>
        <AccordionContent>
          FAQs, settings panels, navigation menus, and more.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const DefaultOpen: Story = {
  render: () => (
    <Accordion type="single" defaultValue="item-1" className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>This one starts open</AccordionTrigger>
        <AccordionContent>
          Use defaultValue to set which item is open by default.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>This one starts closed</AccordionTrigger>
        <AccordionContent>
          Click to open this item.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const FAQ: Story = {
  render: () => (
    <div className="w-[500px]">
      <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
      <Accordion type="single" collapsible>
        <AccordionItem value="q1">
          <AccordionTrigger>What is MDXUI?</AccordionTrigger>
          <AccordionContent>
            MDXUI is a comprehensive component library for building MDX-powered applications.
            It includes 50+ UI components built on Radix UI with Tailwind CSS styling.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="q2">
          <AccordionTrigger>How do I install it?</AccordionTrigger>
          <AccordionContent>
            Install using your package manager: <code className="bg-muted px-1 rounded">pnpm add @mdxui/shadcn</code>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="q3">
          <AccordionTrigger>Is it free to use?</AccordionTrigger>
          <AccordionContent>
            Yes! MDXUI is open source and free to use in personal and commercial projects.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="q4">
          <AccordionTrigger>Does it support dark mode?</AccordionTrigger>
          <AccordionContent>
            Yes, all components support light and dark themes via CSS variables.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}
