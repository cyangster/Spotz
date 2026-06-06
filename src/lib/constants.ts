import type { PinCategory, PinStatus } from './types'

export const PIN_STATUSES: PinStatus[] = ['Went', 'Want to go', 'Favorite', 'Avoid']

export const PIN_CATEGORIES: {
  id: PinCategory
  label: string
  color: string
  icon: string
}[] = [
  { id: 'Park', label: 'Park', color: '#3b82f6', icon: '🌳' },
  { id: 'Restaurant', label: 'Restaurant', color: '#ef4444', icon: '🍽️' },
  { id: 'Cafe', label: 'Cafe', color: '#f59e0b', icon: '☕' },
  { id: 'Bar', label: 'Bar', color: '#8b5cf6', icon: '🍺' },
  { id: 'Shop', label: 'Shop', color: '#ec4899', icon: '🛍️' },
  { id: 'Beach', label: 'Beach', color: '#06b6d4', icon: '🏖️' },
  { id: 'Hike', label: 'Hike', color: '#22c55e', icon: '🏔️' },
  { id: 'Home', label: 'Home', color: '#64748b', icon: '🏠' },
  { id: 'Other', label: 'Other', color: '#94a3b8', icon: '📍' },
]

export const PIN_ICONS = ['📍', '🍕', '☕', '🍺', '🎵', '🏖️', '🏔️', '🛍️', '🎨', '⚽', '🌮', '🍣', '🎬', '🏠', '💼']

export const STATUS_BADGE_CLASSES: Record<PinStatus, string> = {
  Went: 'bg-green-100 text-green-800 border-green-200',
  'Want to go': 'bg-blue-100 text-blue-800 border-blue-200',
  Favorite: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Avoid: 'bg-red-100 text-red-800 border-red-200',
}

export function getCategoryMeta(category: PinCategory) {
  return PIN_CATEGORIES.find((c) => c.id === category) ?? PIN_CATEGORIES[PIN_CATEGORIES.length - 1]
}

export function getCategoryColor(category: PinCategory): string {
  return getCategoryMeta(category).color
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
}

export function isValidUsername(username: string): boolean {
  return username.length >= 3 && /^[a-z0-9_]+$/.test(username)
}

export const USERNAME_PATTERN = /(^|[\s])@([a-z0-9_]{3,20})\b/g
