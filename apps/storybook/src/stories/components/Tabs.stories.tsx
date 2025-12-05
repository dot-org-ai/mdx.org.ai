import type { Meta, StoryObj } from '@storybook/react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@mdxui/shadcn'

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input id="username" defaultValue="@johndoe" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you'll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

export const Simple: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="p-4">
        Content for Tab 1
      </TabsContent>
      <TabsContent value="tab2" className="p-4">
        Content for Tab 2
      </TabsContent>
      <TabsContent value="tab3" className="p-4">
        Content for Tab 3
      </TabsContent>
    </Tabs>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[500px]">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="p-4">
        <h3 className="font-semibold mb-2">Overview</h3>
        <p className="text-sm text-muted-foreground">
          View your dashboard overview and key metrics.
        </p>
      </TabsContent>
      <TabsContent value="analytics" className="p-4">
        <h3 className="font-semibold mb-2">Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Deep dive into your analytics data.
        </p>
      </TabsContent>
      <TabsContent value="reports" className="p-4">
        <h3 className="font-semibold mb-2">Reports</h3>
        <p className="text-sm text-muted-foreground">
          Generate and view reports.
        </p>
      </TabsContent>
      <TabsContent value="settings" className="p-4">
        <h3 className="font-semibold mb-2">Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings.
        </p>
      </TabsContent>
    </Tabs>
  ),
}

export const WithDisabled: Story = {
  render: () => (
    <Tabs defaultValue="active" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value="another">Another</TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="p-4">
        This tab is active.
      </TabsContent>
      <TabsContent value="disabled" className="p-4">
        This content won't be shown.
      </TabsContent>
      <TabsContent value="another" className="p-4">
        Another tab's content.
      </TabsContent>
    </Tabs>
  ),
}

export const CodeExample: Story = {
  render: () => (
    <Tabs defaultValue="preview" className="w-[500px]">
      <TabsList>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>
      <TabsContent value="preview" className="p-4 border rounded-md mt-2">
        <div className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </div>
      </TabsContent>
      <TabsContent value="code" className="mt-2">
        <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
{`<div className="flex gap-2">
  <Button>Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="outline">Outline</Button>
</div>`}
        </pre>
      </TabsContent>
    </Tabs>
  ),
}
