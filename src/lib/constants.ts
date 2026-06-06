import type { PinStatus } from './types'

export const PIN_STATUSES: PinStatus[] = ['Went', 'Want to go', 'Favorite', 'Avoid']

export const PIN_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

export const PIN_ICONS = ['📍', '🍕', '☕', '🍺', '🎵', '🏖️', '🏔️', '🛍️', '🎨', '⚽', '🌮', '🍣', '🎬', '🏠', '💼']

export const STATUS_BADGE_CLASSES: Record<PinStatus, string> = {
  Went: 'bg-green-100 text-green-800 border-green-200',
  'Want to go': 'bg-blue-100 text-blue-800 border-blue-200',
  Favorite: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Avoid: 'bg-red-100 text-red-800 border-red-200',
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
