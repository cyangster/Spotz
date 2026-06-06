import type { PinStatus } from '../lib/types'
import { STATUS_BADGE_CLASSES } from '../lib/constants'

export function StatusBadge({ status }: { status: PinStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  )
}
