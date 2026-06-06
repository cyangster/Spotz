import { useState, type FormEvent } from 'react'
import type { PinStatus } from '../lib/types'
import { PIN_COLORS, PIN_ICONS, PIN_STATUSES } from '../lib/constants'
import { supabase } from '../lib/supabase'

export interface DropPinData {
  label: string
  status: PinStatus
  color: string
  icon: string
  notes: string
  photo: File | null
}

interface DropPinFormProps {
  groupId: string
  latitude: number
  longitude: number
  userId: string
  onClose: () => void
  onSaved: () => void
  initialData?: Partial<DropPinData>
  pinId?: string
}

export function DropPinForm({
  groupId,
  latitude,
  longitude,
  userId,
  onClose,
  onSaved,
  initialData,
  pinId,
}: DropPinFormProps) {
  const [label, setLabel] = useState(initialData?.label ?? '')
  const [status, setStatus] = useState<PinStatus>(initialData?.status ?? 'Want to go')
  const [color, setColor] = useState(initialData?.color ?? PIN_COLORS[5])
  const [icon, setIcon] = useState(initialData?.icon ?? PIN_ICONS[0])
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(pinId)

  async function uploadPhoto(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${groupId}/${userId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('pin-photos')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from('pin-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      setError('Label is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let photoUrl: string | null = null
      if (photo) {
        photoUrl = await uploadPhoto(photo)
      }

      if (isEditing && pinId) {
        const updates: Record<string, unknown> = {
          label: label.trim(),
          status,
          color,
          icon,
          notes: notes.trim() || null,
        }
        if (photoUrl) {
          updates.photo_url = photoUrl
        }

        const { error: updateError } = await supabase
          .from('pins')
          .update(updates)
          .eq('id', pinId)
          .eq('created_by', userId)

        if (updateError) throw new Error(updateError.message)
      } else {
        const { error: insertError } = await supabase.from('pins').insert({
          group_id: groupId,
          created_by: userId,
          label: label.trim(),
          status,
          color,
          icon,
          notes: notes.trim() || null,
          photo_url: photoUrl,
          latitude,
          longitude,
        })

        if (insertError) throw new Error(insertError.message)
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit pin' : 'Drop a pin'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Label *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Coffee spot, best view..."
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PinStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PIN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {PIN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${color === c ? 'border-slate-900' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PIN_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg ${
                    icon === emoji ? 'border-slate-900 bg-slate-100' : 'border-slate-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional details..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Drop pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
