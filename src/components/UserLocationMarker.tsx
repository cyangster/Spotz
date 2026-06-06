import { useEffect, useState } from 'react'
import { Circle, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'

interface UserLocationMarkerProps {
  onFirstFix?: (lat: number, lng: number) => void
}

export function UserLocationMarker({ onFirstFix }: UserLocationMarkerProps) {
  const map = useMap()
  const [position, setPosition] = useState<{
    lat: number
    lng: number
    accuracy: number
  } | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        setPosition((prev) => {
          if (!prev) {
            onFirstFix?.(next.lat, next.lng)
          }
          return next
        })
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [map, onFirstFix])

  if (!position) return null

  return (
    <>
      <Circle
        center={[position.lat, position.lng]}
        radius={position.accuracy}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
          weight: 1,
        }}
      />
      <Marker
        position={[position.lat, position.lng]}
        icon={L.divIcon({
          className: '',
          html: '<div class="user-location-dot"><div class="user-location-pulse"></div></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })}
        interactive={false}
      />
    </>
  )
}

export function CenterOnUserButton() {
  const map = useMap()
  const [locating, setLocating] = useState(false)

  function handleClick() {
    if (!navigator.geolocation) return

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], Math.max(map.getZoom(), 15), {
          animate: true,
        })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true },
    )
  }

  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: 16, marginRight: 16 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={locating}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
        title="Center on my location"
        aria-label="Center on my location"
      >
        {locating ? '…' : '🎯'}
      </button>
    </div>
  )
}
