import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(join(__dirname, 'index.css'), 'utf-8')

// Strip the :root { } block so we can scan the rest for bare values
const rootBlock = css.match(/:root\s*\{[^}]*\}/s)?.[0] ?? ''
const outsideRoot = css.replace(rootBlock, '')

describe('index.css — layout classes', () => {
  it('should define app-layout class', () => {
    expect(outsideRoot).toContain('.app-layout')
  })

  it('should define app-sidebar class', () => {
    expect(outsideRoot).toContain('.app-sidebar')
  })

  it('should define app-sidebar--collapsed class', () => {
    expect(outsideRoot).toContain('.app-sidebar--collapsed')
  })

  it('should define page-header class', () => {
    expect(outsideRoot).toContain('.page-header')
  })
})

describe('index.css — shared component classes', () => {
  it('should define btn-primary class', () => {
    expect(outsideRoot).toContain('.btn-primary')
  })

  it('should define btn-secondary class', () => {
    expect(outsideRoot).toContain('.btn-secondary')
  })

  it('should define btn-danger class', () => {
    expect(outsideRoot).toContain('.btn-danger')
  })

  it('should define input-error class', () => {
    expect(outsideRoot).toContain('.input-error')
  })
})

describe('index.css — design tokens', () => {
  it('should define all colour tokens in :root', () => {
    const tokens = [
      '--color-bg',
      '--color-surface',
      '--color-border',
      '--color-text',
      '--color-text-muted',
      '--color-accent',
      '--color-accent-dim',
      '--color-error',
      '--color-success',
    ]
    for (const token of tokens) {
      expect(rootBlock, `missing ${token}`).toContain(token)
    }
  })

  it('should define font-size tokens in :root', () => {
    const tokens = [
      '--font-size-xs',
      '--font-size-sm',
      '--font-size-base',
      '--font-size-lg',
      '--font-size-xl',
    ]
    for (const token of tokens) {
      expect(rootBlock, `missing ${token}`).toContain(token)
    }
  })

  it('should define spacing tokens in :root', () => {
    for (let i = 1; i <= 8; i++) {
      expect(rootBlock, `missing --space-${i}`).toContain(`--space-${i}`)
    }
  })

  it('should define border-radius tokens in :root', () => {
    const tokens = ['--radius-sm', '--radius-md', '--radius-lg']
    for (const token of tokens) {
      expect(rootBlock, `missing ${token}`).toContain(token)
    }
  })

  it('should define shadow tokens in :root', () => {
    const tokens = ['--shadow-sm', '--shadow-md']
    for (const token of tokens) {
      expect(rootBlock, `missing ${token}`).toContain(token)
    }
  })

  it('should not contain bare hex colours outside :root', () => {
    // Allow hex inside comments (/* ... */) — strip them first
    const noComments = outsideRoot.replace(/\/\*[\s\S]*?\*\//g, '')
    const hexPattern = /#([0-9a-fA-F]{3,8})\b/g
    const matches = [...noComments.matchAll(hexPattern)].map(m => m[0])
    expect(matches, `bare hex values found outside :root: ${matches.join(', ')}`).toHaveLength(0)
  })
})
