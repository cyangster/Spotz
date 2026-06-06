import type { PinStatus } from '../lib/types'
import { PIN_STATUSES, STATUS_BADGE_CLASSES } from '../lib/constants'

interface StatusPickerProps {
  status: PinStatus
  onChange: (status: PinStatus) => void
  disabled?: boolean
}

export function StatusPicker({ status, onChange, disabled }: StatusPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PIN_STATUSES.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
            STATUS_BADGE_CLASSES[option]
          } ${status === option ? 'ring-2 ring-slate-900 ring-offset-1' : 'opacity-70 hover:opacity-100'} disabled:opacity-40`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function StatusBadge({ status }: { status: PinStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  )
}
