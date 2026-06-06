import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Profile } from '../lib/types'
import { getMentionQuery, insertMention } from '../lib/mentions'

interface CommentInputProps {
  members: Profile[]
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  posting: boolean
}

export function CommentInput({ members, value, onChange, onSubmit, posting }: CommentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  const suggestions =
    mentionQuery === null
      ? []
      : members
          .filter((m) => m.username.startsWith(mentionQuery))
          .slice(0, 5)

  function updateMentionState(nextValue: string, cursor: number) {
    onChange(nextValue)
    setMentionQuery(getMentionQuery(nextValue, cursor))
  }

  function handleChange(nextValue: string) {
    const cursor = inputRef.current?.selectionStart ?? nextValue.length
    updateMentionState(nextValue, cursor)
  }

  function pickMember(username: string) {
    const cursor = inputRef.current?.selectionStart ?? value.length
    const { value: nextValue, cursor: nextCursor } = insertMention(value, cursor, username)
    onChange(nextValue)
    setMentionQuery(null)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(nextCursor, nextCursor)
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey && suggestions.length === 0) {
      e.preventDefault()
      onSubmit()
    }
    if (e.key === 'Escape') {
      setMentionQuery(null)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) =>
            setMentionQuery(getMentionQuery(value, (e.target as HTMLInputElement).selectionStart ?? 0))
          }
          placeholder="Add a comment... @ to mention"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {suggestions.length > 0 && (
          <ul className="absolute bottom-full left-0 z-10 mb-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {suggestions.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => pickMember(member.username)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-blue-600">@{member.username}</span>
                  <span className="truncate text-slate-500">{member.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={posting || !value.trim()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Post
      </button>
    </form>
  )
}
