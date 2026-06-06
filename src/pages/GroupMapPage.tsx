import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { DropPinForm } from '../components/DropPinForm'
import { PinDetailPanel } from '../components/PinDetailPanel'
import { PinMarker } from '../components/PinMarker'
import { CenterOnUserButton, UserLocationMarker } from '../components/UserLocationMarker'
import { HeaderProfileMenu } from '../components/HeaderProfileMenu'
import { supabase } from '../lib/supabase'
import { PROFILE_SELECT, type Group, type Pin } from '../lib/types'

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void
  disabled: boolean
}

function MapClickHandler({ onMapClick, disabled }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (disabled) return
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapInitialCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 14))
  }, [lat, lng, map])

  return null
}

export function GroupMapPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [dropLocation, setDropLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPins = useCallback(async () => {
    if (!groupId) return

    const { data, error: pinError } = await supabase
      .from('pins')
      .select(`*, profile:profiles(${PROFILE_SELECT})`)
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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedPin(null)
    setDropLocation({ lat, lng })
  }, [])

  const handleFirstLocation = useCallback((lat: number, lng: number) => {
    setInitialCenter((prev) => prev ?? { lat, lng })
  }, [])

  function handlePinUpdated() {
    loadPins()
    if (selectedPin) {
      supabase
        .from('pins')
        .select(`*, profile:profiles(${PROFILE_SELECT})`)
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
          <span className="hidden text-xs text-slate-500 sm:inline">Click map to drop a pin</span>
          <Link
            to={`/group/${groupId}/members`}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 sm:px-3 sm:text-sm"
          >
            Members
          </Link>
          <HeaderProfileMenu />
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
        {initialCenter && <MapInitialCenter lat={initialCenter.lat} lng={initialCenter.lng} />}
        <UserLocationMarker onFirstFix={handleFirstLocation} />
        <CenterOnUserButton />
        <MapClickHandler onMapClick={handleMapClick} disabled={Boolean(dropLocation)} />
        {pins.map((pin) => (
          <PinMarker key={pin.id} pin={pin} onSelect={(p) => setSelectedPin(p)} />
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

      {selectedPin && user && groupId && (
        <PinDetailPanel
          pin={selectedPin}
          groupId={groupId}
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
