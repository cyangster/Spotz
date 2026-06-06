import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { isValidUsername, normalizeUsername } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { UserAvatar } from './UserAvatar'

interface ProfileModalProps {
  onClose: () => void
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { profile, user, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile || !user) return null

  const currentProfile = profile

  async function uploadAvatar(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user!.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) throw new Error(uploadError.message)

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Name is required')
      return
    }

    const normalizedUsername = normalizeUsername(username)
    if (!isValidUsername(normalizedUsername)) {
      setError('Username must be 3–20 characters (letters, numbers, underscore)')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let avatarUrl = currentProfile.avatar_url

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile)
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: normalizedUsername,
          avatar_url: avatarUrl,
        })
        .eq('id', user!.id)

      if (updateError) throw new Error(updateError.message)

      await refreshProfile()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file)
    if (file) {
      setAvatarPreview(URL.createObjectURL(file))
    } else {
      setAvatarPreview(currentProfile.avatar_url)
    }
  }

  const previewProfile = {
    display_name: displayName || currentProfile.display_name,
    username: username || currentProfile.username,
    avatar_url: avatarPreview,
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your profile</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <UserAvatar profile={previewProfile} size="lg" />
            <label className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
              Change photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <div className="flex rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="flex items-center pl-3 text-sm text-slate-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                className="w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
                required
                minLength={3}
                maxLength={20}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">{currentProfile.email}</p>

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
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
