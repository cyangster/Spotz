export interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
  shortName: string
}

function toGeocodeResult(item: { lat: string; lon: string; display_name: string }): GeocodeResult {
  const displayName = item.display_name
  const shortName = displayName.split(',')[0]?.trim() || displayName

  return {
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    displayName,
    shortName,
  }
}

export async function searchPlaces(query: string, limit = 5): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', trimmed)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('addressdetails', '0')

  const response = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'Spotz/1.0' },
  })

  if (!response.ok) return []

  const data = (await response.json()) as { lat: string; lon: string; display_name: string }[]
  return data.map(toGeocodeResult)
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const results = await searchPlaces(query, 1)
  return results[0] ?? null
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('format', 'json')

  const response = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'Spotz/1.0' },
  })

  if (!response.ok) return null

  const data = (await response.json()) as { display_name?: string }
  return data.display_name ?? null
}
