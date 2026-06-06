import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { DropPinForm } from '../components/DropPinForm'
import { PinDetailPanel } from '../components/PinDetailPanel'
import { PinMarker } from '../components/PinMarker'
import { supabase } from '../lib/supabase'
import type { Group, Pin } from '../lib/types'

interface MapClickHandlerProps {
  onRightClick: (lat: number, lng: number) => void
}

function MapClickHandler({ onRightClick }: MapClickHandlerProps) {
  useMapEvents({
    contextmenu(e) {
      e.originalEvent.preventDefault()
      onRightClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function GroupMapPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [dropLocation, setDropLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const loadPins = useCallback(async () => {
    if (!groupId) return

    const { data, error: pinError } = await supabase
      .from('pins')
      .select('*, profile:profiles(id, display_name, email)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (pinError) {
      setError(pinError.message)
    } else {
      setPins((data as Pin[]) ?? [])
    }
  }, [groupId])

  useEffect(() => {
    if (!groupId || !user) return
    const currentUser = user

    async function loadGroup() {
      const { data, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) {
        setError(groupError.message)
        setLoading(false)
        return
      }

      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', currentUser.id)
        .single()

      if (!membership) {
        setError('You are not a member of this group')
        setLoading(false)
        return
      }

      setGroup(data)
      await loadPins()
      setLoading(false)
    }

    loadGroup()
  }, [groupId, user, loadPins])

  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`pins:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pins', filter: `group_id=eq.${groupId}` },
        () => loadPins(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, loadPins])

  function handleDropAtCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDropLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocating(false)
      },
      () => {
        setError('Could not get your location')
        setLocating(false)
      },
    )
  }

  function handlePinUpdated() {
    loadPins()
    if (selectedPin) {
      supabase
        .from('pins')
        .select('*, profile:profiles(id, display_name, email)')
        .eq('id', selectedPin.id)
        .single()
        .then(({ data }) => {
          if (data) setSelectedPin(data as Pin)
        })
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading map...</p>
      </div>
    )
  }

  if (error && !group) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-50 p-4">
        <p className="text-red-600">{error}</p>
        <Link to="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-0 right-0 top-0 z-[500] flex items-center justify-between gap-2 bg-white/90 px-3 py-2 shadow-sm backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" className="shrink-0 text-sm text-slate-500 hover:text-slate-800">
            ← Spotz
          </Link>
          <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
            {group?.name}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={`/group/${groupId}/members`}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 sm:px-3 sm:text-sm"
          >
            Members
          </Link>
          <button
            type="button"
            onClick={handleDropAtCurrentLocation}
            disabled={locating}
            className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:px-3 sm:text-sm"
          >
            {locating ? 'Locating...' : '📍 Drop here'}
          </button>
        </div>
      </div>

      {error && (
        <div className="absolute left-1/2 top-14 z-[500] -translate-x-1/2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      <MapContainer
        center={[40.7128, -74.006]}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onRightClick={(lat, lng) => setDropLocation({ lat, lng })} />
        {pins.map((pin) => (
          <PinMarker
            key={pin.id}
            pin={pin}
            onSelect={(p) => setSelectedPin(p)}
          />
        ))}
      </MapContainer>

      {dropLocation && user && groupId && (
        <DropPinForm
          groupId={groupId}
          latitude={dropLocation.lat}
          longitude={dropLocation.lng}
          userId={user.id}
          onClose={() => setDropLocation(null)}
          onSaved={loadPins}
        />
      )}

      {selectedPin && user && (
        <PinDetailPanel
          pin={selectedPin}
          userId={user.id}
          onClose={() => setSelectedPin(null)}
          onUpdated={handlePinUpdated}
          onDeleted={() => {
            setSelectedPin(null)
            loadPins()
          }}
        />
      )}
    </div>
  )
}
