import { useCallback, useEffect, useState } from 'react'
import { commentMentionsUsername } from '../lib/mentions'
import { supabase } from '../lib/supabase'
import type { Comment } from '../lib/types'

export async function fetchUnreadMentionCommentIds(
  userId: string,
  username: string,
): Promise<Set<string>> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  const groupIds = memberships?.map((m) => m.group_id) ?? []
  if (groupIds.length === 0) return new Set()

  const { data: pins } = await supabase.from('pins').select('id').in('group_id', groupIds)
  const pinIds = pins?.map((p) => p.id) ?? []
  if (pinIds.length === 0) return new Set()

  const { data: comments } = await supabase
    .from('comments')
    .select('id, user_id, content')
    .in('pin_id', pinIds)

  const { data: reads } = await supabase
    .from('mention_reads')
    .select('comment_id')
    .eq('user_id', userId)

  const readIds = new Set(reads?.map((r) => r.comment_id) ?? [])
  const unread = new Set<string>()

  for (const comment of comments ?? []) {
    if (comment.user_id === userId) continue
    if (readIds.has(comment.id)) continue
    if (commentMentionsUsername(comment.content, username)) {
      unread.add(comment.id)
    }
  }

  return unread
}

export async function markMentionCommentsRead(userId: string, commentIds: string[]) {
  if (commentIds.length === 0) return

  const rows = commentIds.map((comment_id) => ({ user_id: userId, comment_id }))
  await supabase.from('mention_reads').upsert(rows, { onConflict: 'user_id,comment_id' })
}

export function getMentionedUnreadOnPin(
  comments: Comment[],
  username: string,
  userId: string,
  unreadIds: Set<string>,
): string[] {
  return comments
    .filter(
      (c) =>
        c.user_id !== userId &&
        unreadIds.has(c.id) &&
        commentMentionsUsername(c.content, username),
    )
    .map((c) => c.id)
}

export function useUnreadMentions(username: string | undefined, userId: string | undefined) {
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!username || !userId) {
      setUnreadIds(new Set())
      return
    }
    const ids = await fetchUnreadMentionCommentIds(userId, username)
    setUnreadIds(ids)
  }, [username, userId])

  const markRead = useCallback(
    async (commentIds: string[]) => {
      if (!userId || commentIds.length === 0) return
      await markMentionCommentsRead(userId, commentIds)
      setUnreadIds((prev) => {
        const next = new Set(prev)
        commentIds.forEach((id) => next.delete(id))
        return next
      })
    },
    [userId],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`mentions:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  return {
    unreadIds,
    unreadCount: unreadIds.size,
    refresh,
    markRead,
  }
}
