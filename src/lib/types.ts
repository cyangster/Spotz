export type PinStatus = 'Went' | 'Want to go' | 'Favorite' | 'Avoid'

export type PinCategory =
  | 'Park'
  | 'Restaurant'
  | 'Cafe'
  | 'Bar'
  | 'Shop'
  | 'Beach'
  | 'Hike'
  | 'Home'
  | 'Other'

export interface Profile {
  id: string
  display_name: string
  username: string
  email: string
  avatar_url: string | null
}

export interface Group {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface Pin {
  id: string
  group_id: string
  created_by: string
  label: string
  status: PinStatus
  category: PinCategory
  color: string
  icon: string
  notes: string | null
  photo_url: string | null
  address: string | null
  latitude: number
  longitude: number
  created_at: string
  profile?: Profile
}

export interface Comment {
  id: string
  pin_id: string
  user_id: string
  content: string
  created_at: string
  profile?: Profile
}

export interface GroupWithRole extends Group {
  member_count?: number
}

export const PROFILE_SELECT = 'id, display_name, username, email, avatar_url'

export const PROFILE_EMBED = {
  comment: `profiles!comments_user_id_fkey(${PROFILE_SELECT})`,
  pin: `profiles!pins_created_by_fkey(${PROFILE_SELECT})`,
  member: `profiles!group_members_user_id_fkey(${PROFILE_SELECT})`,
} as const
