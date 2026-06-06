import { useCallback, useEffect, useState } from 'react'
import { commentMentionsUsername } from '../lib/mentions'
import { supabase } from '../lib/supabase'
import type { Comment } from '../lib/types'

export interface UnreadMentionState {
  commentIds: Set<string>
  pinIds: Set<string>
}

export async function fetchUnreadMentionState(
  userId: string,
  username: string,
): Promise<UnreadMentionState> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  const groupIds = memberships?.map((m) => m.group_id) ?? []
  if (groupIds.length === 0) {
    return { commentIds: new Set(), pinIds: new Set() }
  }

  const { data: pins } = await supabase.from('pins').select('id').in('group_id', groupIds)
  const pinIds = pins?.map((p) => p.id) ?? []
  if (pinIds.length === 0) {
    return { commentIds: new Set(), pinIds: new Set() }
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('id, user_id, content, pin_id')
    .in('pin_id', pinIds)

  const { data: reads } = await supabase
    .from('mention_reads')
    .select('comment_id')
    .eq('user_id', userId)

  const readIds = new Set(reads?.map((r) => r.comment_id) ?? [])
  const commentIds = new Set<string>()
  const unreadPinIds = new Set<string>()

  for (const comment of comments ?? []) {
    if (comment.user_id === userId) continue
    if (readIds.has(comment.id)) continue
    if (commentMentionsUsername(comment.content, username)) {
      commentIds.add(comment.id)
      unreadPinIds.add(comment.pin_id)
    }
  }

  return { commentIds, pinIds: unreadPinIds }
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
  const [unreadPinIds, setUnreadPinIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!username || !userId) {
      setUnreadIds(new Set())
      setUnreadPinIds(new Set())
      return
    }
    const state = await fetchUnreadMentionState(userId, username)
    setUnreadIds(state.commentIds)
    setUnreadPinIds(state.pinIds)
  }, [username, userId])

  const markRead = useCallback(
    async (commentIds: string[]) => {
      if (!userId || commentIds.length === 0) return
      await markMentionCommentsRead(userId, commentIds)
      await refresh()
    },
    [userId, refresh],
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

    const interval = setInterval(refresh, 8000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId, refresh])

  return {
    unreadIds,
    unreadPinIds,
    unreadCount: unreadIds.size,
    refresh,
    markRead,
  }
}
