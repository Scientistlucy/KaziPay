import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { MdCheck } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

// Status is expressed by weight within one blue, not by hue (docs/DESIGN_SYSTEM.md 3). Red is the only alarm.
export type Tone = 'neutral' | 'brand' | 'partial' | 'done' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  brand: 'bg-brand-50 text-brand-700',
  partial: 'bg-white text-brand-700 ring-1 ring-inset ring-brand-300',
  done: 'bg-brand-600 text-white',
  danger: 'bg-danger-soft text-danger',
}

function Marker({ tone }: { tone: Tone }) {
  if (tone === 'done') return <Icon icon={MdCheck} size="xs" />
  if (tone === 'partial') return <span className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)] ring-1 ring-current" aria-hidden />
  if (tone === 'neutral') return null
  return <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
}

type BadgeProps = { tone?: Tone; children: ReactNode; icon?: IconType; className?: string }

export function Badge({ tone = 'neutral', children, icon, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-caption font-semibold', tones[tone], className)}>
      {icon ? <Icon icon={icon} size="xs" /> : <Marker tone={tone} />}
      {children}
    </span>
  )
}

const statusMap: Record<string, { tone: Tone; label: string }> = {
  DRAFT: { tone: 'neutral', label: 'Draft' },
  VOID: { tone: 'neutral', label: 'Void' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
  ARCHIVED: { tone: 'neutral', label: 'Archived' },
  ON_HOLD: { tone: 'neutral', label: 'On hold' },
  TODO: { tone: 'neutral', label: 'To do' },
  SENT: { tone: 'brand', label: 'Sent' },
  VIEWED: { tone: 'brand', label: 'Viewed' },
  IN_PROGRESS: { tone: 'brand', label: 'In progress' },
  ACTIVE: { tone: 'brand', label: 'Active' },
  PENDING: { tone: 'brand', label: 'Pending' },
  INVITED: { tone: 'brand', label: 'Invited' },
  PARTIALLY_PAID: { tone: 'partial', label: 'Partially paid' },
  REVIEW: { tone: 'partial', label: 'In review' },
  SUBMITTED: { tone: 'partial', label: 'Submitted' },
  PAID: { tone: 'done', label: 'Paid' },
  DONE: { tone: 'done', label: 'Done' },
  COMPLETED: { tone: 'done', label: 'Completed' },
  APPROVED: { tone: 'done', label: 'Approved' },
  SUCCEEDED: { tone: 'done', label: 'Received' },
  OVERDUE: { tone: 'danger', label: 'Overdue' },
  REJECTED: { tone: 'danger', label: 'Rejected' },
  FAILED: { tone: 'danger', label: 'Failed' },
  AT_RISK: { tone: 'danger', label: 'At risk' },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = statusMap[status] ?? { tone: 'neutral' as Tone, label: status }
  return <Badge tone={entry.tone} className={className}>{entry.label}</Badge>
}

export function statusLabel(status: string) {
  return statusMap[status]?.label ?? status
}
