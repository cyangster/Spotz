import { getCategoryMeta } from './constants'
import type { Pin, PinCategory } from './types'

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

export function getPinSearchKeywords(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean)
}

export function getPinSearchText(pin: Pin): string {
  const category = (pin.category ?? 'Other') as PinCategory
  const categoryLabel = getCategoryMeta(category).label

  return [
    pin.label,
    pin.status,
    category,
    categoryLabel,
    pin.icon,
    pin.notes,
    pin.address,
    pin.profile?.display_name,
    pin.profile?.username,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function pinMatchesKeywords(pin: Pin, query: string): boolean {
  const keywords = getPinSearchKeywords(query)
  if (keywords.length === 0) return true

  const haystack = getPinSearchText(pin)
  return keywords.every((keyword) => haystack.includes(keyword))
}

export function filterPinsByKeywords(pins: Pin[], query: string): Pin[] {
  if (!query.trim()) return pins
  return pins.filter((pin) => pinMatchesKeywords(pin, query))
}
