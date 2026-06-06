export type PinStatus = 'Went' | 'Want to go' | 'Favorite' | 'Avoid'

export interface Profile {
  id: string
  display_name: string
  email: string
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
  color: string
  icon: string
  notes: string | null
  photo_url: string | null
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
