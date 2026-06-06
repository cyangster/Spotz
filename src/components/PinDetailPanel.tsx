import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Comment, Pin, PinCategory, Profile } from '../lib/types'
import { PROFILE_EMBED } from '../lib/types'
import { formatDate, getCategoryMeta } from '../lib/constants'
import { commentMentionsUsername, renderTextWithMentions } from '../lib/mentions'
import {
  getMentionedUnreadOnPin,
  useUnreadMentions,
} from '../hooks/useUnreadMentions'
import { CommentInput } from './CommentInput'
import { StatusBadge } from './StatusBadge'
import { DropPinForm } from './DropPinForm'
import { UserAvatar } from './UserAvatar'

interface PinDetailPanelProps {
  pin: Pin
  groupId: string
  userId: string
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}

export function PinDetailPanel({
  pin,
  groupId,
  userId,
  onClose,
  onUpdated,
  onDeleted,
}: PinDetailPanelProps) {
  const { profile } = useAuth()
  const { unreadIds, markRead } = useUnreadMentions(profile?.username, userId)
  const [comments, setComments] = useState<Comment[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [posting, setPosting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const commentsRef = useRef(comments)
  const unreadIdsRef = useRef(unreadIds)
  const profileRef = useRef(profile)

  commentsRef.current = comments
  unreadIdsRef.current = unreadIds
  profileRef.current = profile

  const isOwner = pin.created_by === userId
  const category = (pin.category ?? 'Other') as PinCategory
  const categoryMeta = getCategoryMeta(category)

  async function loadComments() {
    const { data, error: fetchError } = await supabase
      .from('comments')
      .select(`*, profile:${PROFILE_EMBED.comment}`)
      .eq('pin_id', pin.id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setComments((data as Comment[]) ?? [])
    }
    setLoadingComments(false)
  }

  async function loadMembers() {
    const { data } = await supabase
      .from('group_members')
      .select(`profile:${PROFILE_EMBED.member}`)
      .eq('group_id', groupId)

    setMembers((data ?? []).map((row) => row.profile as unknown as Profile))
  }

  useEffect(() => {
    loadComments()
    loadMembers()

    const channel = supabase
      .channel(`comments:${pin.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `pin_id=eq.${pin.id}` },
        () => loadComments(),
      )
      .subscribe()

    const interval = setInterval(loadComments, 4000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      const currentProfile = profileRef.current
      if (currentProfile?.username) {
        const toMark = getMentionedUnreadOnPin(
          commentsRef.current,
          currentProfile.username,
          userId,
          unreadIdsRef.current,
        )
        void markRead(toMark)
      }
    }
  }, [pin.id, groupId, userId, markRead])

  useEffect(() => {
    if (!profile?.username || loadingComments) return
    const toMark = getMentionedUnreadOnPin(comments, profile.username, userId, unreadIds)
    if (toMark.length > 0) {
      void markRead(toMark)
    }
  }, [comments, loadingComments, profile?.username, userId, unreadIds, markRead])

  async function handlePostComment() {
    if (!newComment.trim()) return

    setPosting(true)
    setError(null)

    const { error: insertError } = await supabase.from('comments').insert({
      pin_id: pin.id,
      user_id: userId,
      content: newComment.trim(),
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setNewComment('')
      await loadComments()
    }
    setPosting(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this pin? This cannot be undone.')) return

    setDeleting(true)
    const { error: deleteError } = await supabase
      .from('pins')
      .delete()
      .eq('id', pin.id)
      .eq('created_by', userId)

    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }

    onDeleted()
    onClose()
  }

  function commentMentionedMe(comment: Comment) {
    if (!profile?.username) return false
    return (
      comment.user_id !== userId &&
      unreadIds.has(comment.id) &&
      commentMentionsUsername(comment.content, profile.username)
    )
  }

  if (editing) {
    return (
      <DropPinForm
        groupId={pin.group_id}
        latitude={pin.latitude}
        longitude={pin.longitude}
        userId={userId}
        pinId={pin.id}
        initialData={{
          label: pin.label,
          status: pin.status,
          category,
          icon: pin.icon,
          notes: pin.notes ?? '',
        }}
        onClose={() => setEditing(false)}
        onSaved={onUpdated}
      />
    )
  }

  const pinAuthor = pin.profile ?? {
    display_name: 'Unknown',
    username: 'unknown',
    avatar_url: null,
  }

  return (
    <div className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-md flex-col bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="truncate text-lg font-semibold text-slate-900">{pin.label}</h2>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-2xl">{pin.icon}</span>
          <StatusBadge status={pin.status} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryMeta.color }} />
            {categoryMeta.label}
          </span>
        </div>

        {pin.photo_url && (
          <img src={pin.photo_url} alt={pin.label} className="mb-4 w-full rounded-lg object-cover" />
        )}

        {pin.notes && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{pin.notes}</p>
        )}

        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <UserAvatar profile={pinAuthor} size="sm" />
          <span>
            Dropped by {pin.profile?.display_name ?? 'Unknown'}
            {pin.profile?.username ? ` (@${pin.profile.username})` : ''} · {formatDate(pin.created_at)}
          </span>
        </div>

        {isOwner && (
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Comments</h3>

          {loadingComments ? (
            <p className="text-sm text-slate-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No comments yet.</p>
          ) : (
            <ul className="mb-4 space-y-3">
              {comments.map((comment) => {
                const author = comment.profile ?? {
                  display_name: 'Unknown',
                  username: 'unknown',
                  avatar_url: null,
                }

                return (
                  <li
                    key={comment.id}
                    className={`flex gap-3 rounded-lg p-3 ${
                      commentMentionedMe(comment) ? 'bg-blue-50 ring-1 ring-blue-100' : 'bg-slate-50'
                    }`}
                  >
                    <UserAvatar profile={author} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {comment.profile?.display_name ?? 'Unknown'}
                          {comment.profile?.username && (
                            <span className="ml-1 font-normal text-blue-600">
                              @{comment.profile.username}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">
                        {renderTextWithMentions(comment.content)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <CommentInput
            members={members}
            value={newComment}
            onChange={setNewComment}
            onSubmit={handlePostComment}
            posting={posting}
          />

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
