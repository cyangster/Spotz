import type { Profile } from '../lib/types'

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
} as const

function getInitials(profile: Pick<Profile, 'display_name' | 'username'>) {
  const source = profile.display_name.trim() || profile.username
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

interface UserAvatarProps {
  profile: Pick<Profile, 'display_name' | 'username' | 'avatar_url'>
  size?: keyof typeof SIZE_CLASSES
  showMentionBadge?: boolean
  className?: string
}

export function UserAvatar({
  profile,
  size = 'md',
  showMentionBadge = false,
  className = '',
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size]

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.display_name}
          className={`rounded-full object-cover ${sizeClass}`}
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ${sizeClass}`}
        >
          {getInitials(profile)}
        </div>
      )}
      {showMentionBadge && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
          aria-label="You were mentioned"
        />
      )}
    </div>
  )
}
