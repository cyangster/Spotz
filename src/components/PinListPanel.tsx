import { useMemo, useState } from 'react'
import type { Pin, PinCategory, PinStatus } from '../lib/types'
import { filterPinsByKeywords } from '../lib/pinSearch'
import {
  PIN_CATEGORIES,
  PIN_STATUSES,
  STATUS_BADGE_CLASSES,
} from '../lib/constants'

type SortOption = 'name' | 'date' | 'status'

interface PinListPanelProps {
  pins: Pin[]
  selectedPinId: string | null
  onSelectPin: (pin: Pin) => void
  onClose: () => void
}

export function PinListPanel({ pins, selectedPinId, onSelectPin, onClose }: PinListPanelProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [statusFilter, setStatusFilter] = useState<PinStatus[]>([...PIN_STATUSES])
  const [collapsed, setCollapsed] = useState<Set<PinCategory>>(new Set())

  const filteredPins = useMemo(
    () => filterPinsByKeywords(pins, search).filter((pin) => statusFilter.includes(pin.status)),
    [pins, search, statusFilter],
  )

  const grouped = useMemo(() => {
    const sortPins = (list: Pin[]) => {
      const copy = [...list]
      if (sortBy === 'name') {
        copy.sort((a, b) => a.label.localeCompare(b.label))
      } else if (sortBy === 'status') {
        copy.sort((a, b) => a.status.localeCompare(b.status) || a.label.localeCompare(b.label))
      } else {
        copy.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
      }
      return copy
    }

    return PIN_CATEGORIES.map((cat) => ({
      category: cat,
      pins: sortPins(
        filteredPins.filter((pin) => ((pin.category ?? 'Other') as PinCategory) === cat.id),
      ),
    })).filter((group) => group.pins.length > 0)
  }, [filteredPins, sortBy])

  function toggleCategory(category: PinCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  function toggleStatus(status: PinStatus) {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    )
  }

  return (
    <div className="fixed inset-y-0 left-0 z-[900] flex w-full max-w-sm flex-col bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">Pin list</h2>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
          ✕
        </button>
      </div>

      <div className="space-y-3 border-b border-slate-200 p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keywords, name, address, notes..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="date">Newest first</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-slate-500">Show statuses</label>
          <div className="flex flex-wrap gap-1.5">
            {PIN_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  STATUS_BADGE_CLASSES[status]
                } ${statusFilter.includes(status) ? 'ring-1 ring-slate-400' : 'opacity-40'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {grouped.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-500">No pins match your filters.</p>
        ) : (
          grouped.map(({ category, pins: categoryPins }) => {
            const isCollapsed = collapsed.has(category.id)

            return (
              <div key={category.id} className="mb-3">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1 text-sm font-semibold text-slate-900">
                    {category.label}
                  </span>
                  <span className="text-xs text-slate-500">{categoryPins.length}</span>
                  <span className="text-xs text-slate-400">{isCollapsed ? '▸' : '▾'}</span>
                </button>

                {!isCollapsed && (
                  <ul className="mt-1 space-y-1">
                    {categoryPins.map((pin) => (
                      <li key={pin.id}>
                        <button
                          type="button"
                          onClick={() => onSelectPin(pin)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                            selectedPinId === pin.id
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{pin.icon}</span>
                            <span className="flex-1 truncate text-sm font-medium text-slate-900">
                              {pin.label}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 pl-6">
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASSES[pin.status]}`}
                            >
                              {pin.status}
                            </span>
                            {pin.address && (
                              <span className="truncate text-[10px] text-slate-500">
                                {pin.address}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
