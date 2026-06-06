import { useEffect } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Pin } from '../lib/types'

const OWN_PIN_BORDER = '#0f172a'
const OTHER_PIN_BORDER = '#cbd5e1'

interface PinMarkerProps {
  pin: Pin
  isOwn: boolean
  hasUnreadMention: boolean
  onSelect: (pin: Pin) => void
}

function createPinIcon(
  color: string,
  icon: string,
  borderColor: string,
  hasUnreadMention: boolean,
) {
  const badge = hasUnreadMention ? '<span class="pin-mention-badge"></span>' : ''

  return L.divIcon({
    className: '',
    html: `<div class="pin-marker-wrap">${badge}<div class="pin-marker" style="background-color:${color};border-color:${borderColor}"><span>${icon}</span></div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

export function PinMarker({ pin, isOwn, hasUnreadMention, onSelect }: PinMarkerProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
  }, [])

  const borderColor = isOwn ? OWN_PIN_BORDER : OTHER_PIN_BORDER

  return (
    <Marker
      position={[pin.latitude, pin.longitude]}
      icon={createPinIcon(pin.color, pin.icon, borderColor, hasUnreadMention)}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation()
          onSelect(pin)
        },
      }}
    />
  )
}
