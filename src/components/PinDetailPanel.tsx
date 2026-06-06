import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Comment, Pin } from '../lib/types'
import { formatDate } from '../lib/constants'
import { StatusBadge } from './StatusBadge'
import { DropPinForm } from './DropPinForm'

interface PinDetailPanelProps {
  pin: Pin
  userId: string
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}

export function PinDetailPanel({ pin, userId, onClose, onUpdated, onDeleted }: PinDetailPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [posting, setPosting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = pin.created_by === userId

  async function loadComments() {
    const { data, error: fetchError } = await supabase
      .from('comments')
      .select('*, profile:profiles(id, display_name, email)')
      .eq('pin_id', pin.id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setComments((data as Comment[]) ?? [])
    }
    setLoadingComments(false)
  }

  useEffect(() => {
    loadComments()

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
  }, [pin.id])

  async function handlePostComment(e: FormEvent) {
    e.preventDefault()
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
          color: pin.color,
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
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">{pin.icon}</span>
          <StatusBadge status={pin.status} />
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
          Dropped by {pin.profile?.display_name ?? 'Unknown'} · {formatDate(pin.created_at)}
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
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={posting || !newComment.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Post
            </button>
          </form>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
