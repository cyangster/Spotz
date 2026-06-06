import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUnreadMentions } from '../hooks/useUnreadMentions'
import { ProfileModal } from './ProfileModal'
import { UserAvatar } from './UserAvatar'

export function HeaderProfileMenu() {
  const { profile, user } = useAuth()
  const [open, setOpen] = useState(false)
  const { unreadCount } = useUnreadMentions(profile?.username, user?.id)

  if (!profile) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 hover:bg-slate-100"
        title="Edit profile"
      >
        <UserAvatar profile={profile} size="md" showMentionBadge={unreadCount > 0} />
        <span className="hidden text-sm text-slate-600 sm:inline">@{profile.username}</span>
      </button>

      {open && <ProfileModal onClose={() => setOpen(false)} />}
    </>
  )
}
