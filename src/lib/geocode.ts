export interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', trimmed)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '0')

  const response = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'Spotz/1.0' },
  })

  if (!response.ok) return null

  const data = (await response.json()) as { lat: string; lon: string; display_name: string }[]
  if (!data.length) return null

  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  }
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
