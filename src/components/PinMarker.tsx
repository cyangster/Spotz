import { useEffect } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Pin } from '../lib/types'

interface PinMarkerProps {
  pin: Pin
  onSelect: (pin: Pin) => void
}

function createPinIcon(color: string, icon: string) {
  return L.divIcon({
    className: '',
    html: `<div class="pin-marker" style="background-color: ${color}"><span>${icon}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

export function PinMarker({ pin, onSelect }: PinMarkerProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
  }, [])

  return (
    <Marker
      position={[pin.latitude, pin.longitude]}
      icon={createPinIcon(pin.color, pin.icon)}
      eventHandlers={{
        click: () => onSelect(pin),
      }}
    />
  )
}
