import { useEffect, useMemo, useRef, useState } from 'react'
import type { GeocodeResult } from '../lib/geocode'
import { searchPlaces } from '../lib/geocode'
import { filterPinsByKeywords } from '../lib/pinSearch'
import type { Pin } from '../lib/types'

export interface PlaceSelection {
  latitude: number
  longitude: number
  label: string
  address: string
}

interface MapSearchBarProps {
  pins: Pin[]
  onSelectPin: (pin: Pin) => void
  onSelectPlace: (place: PlaceSelection) => void
  disabled?: boolean
}

export function MapSearchBar({
  pins,
  onSelectPin,
  onSelectPlace,
  disabled,
}: MapSearchBarProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [places, setPlaces] = useState<GeocodeResult[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const matchingPins = useMemo(
    () => filterPinsByKeywords(pins, query).slice(0, 6),
    [pins, query],
  )

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setPlaces([])
      setLoadingPlaces(false)
      return
    }

    setLoadingPlaces(true)
    const timer = setTimeout(() => {
      searchPlaces(query, 5)
        .then(setPlaces)
        .finally(() => setLoadingPlaces(false))
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasQuery = query.trim().length > 0
  const showDropdown = open && hasQuery
  const hasResults = matchingPins.length > 0 || places.length > 0 || loadingPlaces

  function handleSelectPin(pin: Pin) {
    setQuery('')
    setOpen(false)
    onSelectPin(pin)
  }

  function handleSelectPlace(place: GeocodeResult) {
    setQuery('')
    setOpen(false)
    onSelectPlace({
      latitude: place.latitude,
      longitude: place.longitude,
      label: place.shortName,
      address: place.displayName,
    })
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute left-1/2 top-14 z-[600] w-[min(100%-1.5rem,28rem)] -translate-x-1/2"
    >
      <div className="relative">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-lg">
          <svg
            className="ml-3 h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
            />
          </svg>
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search pins or places to drop a pin..."
            className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setOpen(false)
              }}
              className="mr-2 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {!hasResults && (
              <p className="px-4 py-3 text-sm text-slate-500">
                No pins or places match. Try keywords like &quot;coffee brooklyn&quot; or a full
                address.
              </p>
            )}

            {matchingPins.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Group pins
                </p>
                <ul>
                  {matchingPins.map((pin) => (
                    <li key={pin.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectPin(pin)}
                        className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                      >
                        <span className="text-lg leading-none">{pin.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {pin.label}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {[pin.status, pin.address].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(loadingPlaces || places.length > 0) && (
              <div className={matchingPins.length > 0 ? 'border-t border-slate-100' : ''}>
                <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Places — tap to drop a pin
                </p>
                {loadingPlaces && places.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-slate-500">Looking up places...</p>
                ) : (
                  <ul>
                    {places.map((place) => (
                      <li key={`${place.latitude}-${place.longitude}-${place.displayName}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectPlace(place)}
                          className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                        >
                          <span className="text-lg leading-none">📍</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {place.shortName}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {place.displayName}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
