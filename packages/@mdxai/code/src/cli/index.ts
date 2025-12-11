#!/usr/bin/env node

import { Command } from 'commander'
import { runCommand } from './run.js'
import { watchCommand } from './watch.js'
import { listCommand } from './list.js'
import { login, logout } from '../auth/login.js'

const program = new Command()

program
  .name('mdxai-code')
  .description('CLI for Claude Agent sessions with MDX visualization')
  .version('1.0.0')

program
  .command('run <prompt>')
  .description('Run a Claude session')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('-m, --model <model>', 'Model to use', 'sonnet')
  .option(
    '--mode <mode>',
    'Execution mode: local, native, or sandbox',
    'local'
  )
  .option('--base-url <url>', 'Service base URL', 'https://agents.do')
  .action(async (prompt: string, options) => {
    await runCommand(prompt, {
      cwd: options.cwd,
      model: options.model,
      mode: options.mode,
      baseUrl: options.baseUrl,
    })
  })

program
  .command('watch <sessionId>')
  .description('Watch a session in real-time')
  .option('--base-url <url>', 'Service base URL', 'https://agents.do')
  .action(async (sessionId: string, options) => {
    await watchCommand(sessionId, {
      baseUrl: options.baseUrl,
    })
  })

program
  .command('list')
  .description('List all sessions')
  .option('--base-url <url>', 'Service base URL', 'https://agents.do')
  .action(async (options) => {
    await listCommand({
      baseUrl: options.baseUrl,
    })
  })

program
  .command('login')
  .description('Login to agents.do')
  .option('--base-url <url>', 'Service base URL', 'https://agents.do')
  .action(async (options) => {
    try {
      await login({ baseUrl: options.baseUrl })
      console.log('Login successful!')
    } catch (error) {
      console.error('Login failed:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('logout')
  .description('Logout and clear credentials')
  .action(async () => {
    await logout()
  })

program
  .command('dashboard')
  .description('Open dashboard in browser')
  .option('--base-url <url>', 'Service base URL', 'https://agents.do')
  .action((options) => {
    const url = `${options.baseUrl}/sessions`
    console.log(`Opening: ${url}`)
    // Use dynamic import to avoid platform-specific issues
    import('child_process').then(({ exec }) => {
      const command =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open'
      exec(`${command} ${url}`)
    })
  })

program.parse()
