import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Comment, Pin, PinCategory, Profile } from '../lib/types'
import { PROFILE_SELECT } from '../lib/types'
import { formatDate, getCategoryMeta } from '../lib/constants'
import { renderTextWithMentions } from '../lib/mentions'
import { CommentInput } from './CommentInput'
import { StatusBadge } from './StatusBadge'
import { DropPinForm } from './DropPinForm'

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
  const [comments, setComments] = useState<Comment[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [posting, setPosting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = pin.created_by === userId
  const category = (pin.category ?? 'Other') as PinCategory
  const categoryMeta = getCategoryMeta(category)

  async function loadComments() {
    const { data, error: fetchError } = await supabase
      .from('comments')
      .select(`*, profile:profiles(${PROFILE_SELECT})`)
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
      .select(`profile:profiles!inner(${PROFILE_SELECT})`)
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pin.id, groupId])

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
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: categoryMeta.color }}
            />
            {categoryMeta.label}
          </span>
        </div>

        {pin.photo_url && (
          <img
            src={pin.photo_url}
            alt={pin.label}
            className="mb-4 w-full rounded-lg object-cover"
          />
        )}

        {pin.notes && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{pin.notes}</p>
        )}

        <p className="mb-6 text-xs text-slate-500">
          Dropped by {pin.profile?.display_name ?? 'Unknown'}
          {pin.profile?.username ? ` (@${pin.profile.username})` : ''} · {formatDate(pin.created_at)}
        </p>

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
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {comment.profile?.display_name ?? 'Unknown'}
                      {comment.profile?.username && (
                        <span className="ml-1 font-normal text-blue-600">
                          @{comment.profile.username}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{renderTextWithMentions(comment.content)}</p>
                </li>
              ))}
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
