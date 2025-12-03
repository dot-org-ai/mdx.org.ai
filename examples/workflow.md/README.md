# workflow.md

Design Workflows in Markdown.

## Overview

Build automation workflows using Markdown. Define triggers, steps, and conditions in a readable format. Connect to any service. Run anywhere.

## Define a Workflow

```mdx
---
$type: Workflow
name: Customer Onboarding
trigger: customer.created
---

# Customer Onboarding

When a new customer signs up, guide them through onboarding.

## Send Welcome Email

```ts
await email.send({
  to: customer.email,
  template: 'welcome',
  data: { name: customer.name }
})
```

## Create Slack Channel

```ts
const channel = await slack.channels.create({
  name: `customer-${customer.id}`,
  topic: `Support channel for ${customer.name}`
})

await slack.channels.invite(channel.id, ['support-team'])
```

## Schedule Onboarding Call

```ts
const availability = await calendar.findSlot({
  duration: 30,
  attendees: [customer.email, 'success@company.com'],
  within: '3d'
})

await calendar.create({
  title: `Onboarding: ${customer.name}`,
  time: availability,
  attendees: [customer.email, 'success@company.com']
})
```

## Check In After 3 Days

```ts
await wait('3d')

const activity = await analytics.get({
  user: customer.id,
  metric: 'sessions'
})

if (activity.count < 3) {
  await email.send({
    to: customer.email,
    template: 'need-help',
    data: { name: customer.name }
  })
}
```
```

## Triggers

- **Webhooks** - `trigger: webhook`
- **Schedule** - `trigger: cron('0 9 * * *')`
- **Events** - `trigger: customer.created`
- **Manual** - `trigger: manual`

## Control Flow

### Conditions

```ts
if (order.total > 1000) {
  goto('high-value')
} else {
  goto('standard')
}
```

### Parallel Execution

```ts
await parallel([
  sendEmail(customer),
  createTicket(customer),
  notifySlack(customer)
])
```

### Wait

```ts
await wait('1h')
await waitFor('approval.received')
await waitUntil('2024-01-01')
```

### Human Approval

```ts
const approved = await approve({
  assignee: 'manager@company.com',
  message: `Approve refund of $${amount}?`,
  timeout: '24h'
})
```

## Getting Started

```bash
npx workflow.md init my-workflow
npx workflow.md dev my-workflow.md
npx workflow.md deploy my-workflow.md
```
