import { createElement, type ReactNode } from 'react'
import { USERNAME_PATTERN } from './constants'

export function renderTextWithMentions(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let lastIndex = 0
  const regex = new RegExp(USERNAME_PATTERN.source, 'g')

  for (const match of text.matchAll(regex)) {
    const full = match[0]
    const prefix = match[1] ?? ''
    const username = match[2]
    const start = match.index ?? 0

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    parts.push(prefix)
    parts.push(
      createElement(
        'span',
        { key: `${start}-${username}`, className: 'font-semibold text-blue-600' },
        `@${username}`,
      ),
    )

    lastIndex = start + full.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function getMentionQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor)
  const match = before.match(/(?:^|\s)@([a-z0-9_]*)$/)
  return match ? match[1] : null
}

export function insertMention(value: string, cursor: number, username: string): { value: string; cursor: number } {
  const before = value.slice(0, cursor)
  const after = value.slice(cursor)
  const match = before.match(/(?:^|\s)@([a-z0-9_]*)$/)

  if (!match) {
    const next = `${value.slice(0, cursor)}@${username} ${after}`
    return { value: next, cursor: cursor + username.length + 2 }
  }

  const start = before.length - match[0].length + (match[0].startsWith(' ') ? 1 : 0)
  const next = `${value.slice(0, start)}@${username} ${after}`
  return { value: next, cursor: start + username.length + 2 }
}
