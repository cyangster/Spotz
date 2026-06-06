import { useEffect, useState, type FormEvent } from 'react'
import type { PinCategory, PinStatus } from '../lib/types'
import {
  getCategoryColor,
  getCategoryMeta,
  PIN_CATEGORIES,
  PIN_ICONS,
  PIN_STATUSES,
} from '../lib/constants'
import { geocodeAddress, reverseGeocode } from '../lib/geocode'
import { supabase } from '../lib/supabase'

export interface DropPinData {
  label: string
  status: PinStatus
  category: PinCategory
  icon: string
  notes: string
  address: string
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
  const [name, setName] = useState(initialData?.label ?? '')
  const [status, setStatus] = useState<PinStatus>(initialData?.status ?? 'Want to go')
  const [category, setCategory] = useState<PinCategory>(initialData?.category ?? 'Other')
  const [icon, setIcon] = useState(initialData?.icon ?? getCategoryMeta('Other').icon)
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [coords, setCoords] = useState({ latitude, longitude })
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(pinId)

  useEffect(() => {
    if (initialData?.address) return
    reverseGeocode(latitude, longitude).then((result) => {
      if (result) setAddress(result)
    })
  }, [latitude, longitude, initialData?.address])

  function handleCategoryChange(nextCategory: PinCategory) {
    setCategory(nextCategory)
    setIcon(getCategoryMeta(nextCategory).icon)
  }

  async function handleLookupAddress() {
    if (!address.trim()) return

    setGeocoding(true)
    setError(null)

    const result = await geocodeAddress(address)
    if (!result) {
      setError('Address not found. Try a more specific search.')
      setGeocoding(false)
      return
    }

    setCoords({ latitude: result.latitude, longitude: result.longitude })
    setAddress(result.displayName)
    setGeocoding(false)
  }

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
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    let finalCoords = coords
    let finalAddress = address.trim() || null

    if (address.trim()) {
      const geocoded = await geocodeAddress(address)
      if (geocoded) {
        finalCoords = { latitude: geocoded.latitude, longitude: geocoded.longitude }
        finalAddress = geocoded.displayName
        setCoords(finalCoords)
        setAddress(finalAddress)
      }
    }

    const color = getCategoryColor(category)

    try {
      let photoUrl: string | null = null
      if (photo) {
        photoUrl = await uploadPhoto(photo)
      }

      const payload = {
        label: name.trim(),
        status,
        category,
        color,
        icon,
        notes: notes.trim() || null,
        address: finalAddress,
        latitude: finalCoords.latitude,
        longitude: finalCoords.longitude,
      }

      if (isEditing && pinId) {
        const updates: Record<string, unknown> = { ...payload }
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
          photo_url: photoUrl,
          ...payload,
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
          {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Coffee spot, best view..."
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="123 Main St, City..."
              />
              <button
                type="button"
                onClick={handleLookupAddress}
                disabled={geocoding || !address.trim()}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {geocoding ? '...' : 'Locate'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Optional. Locating moves the pin to that address.
            </p>
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
            <label className="mb-2 block text-sm font-medium text-slate-700">Category *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PIN_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCategoryChange(item.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    category === item.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </button>
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
