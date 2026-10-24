import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-ink-100 text-ink-700 ring-ink-200', dot: 'bg-ink-400' },
  brand: { pill: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-brand-600' },
  success: { pill: 'bg-success-soft text-success ring-success-line', dot: 'bg-success' },
  warning: { pill: 'bg-warning-soft text-warning ring-warning-line', dot: 'bg-[#D98A1C]' },
  danger: { pill: 'bg-danger-soft text-danger ring-danger-line', dot: 'bg-danger' },
}

type BadgeProps = { tone?: Tone; children: ReactNode; icon?: IconType; dot?: boolean; className?: string }

export function Badge({ tone = 'neutral', children, icon, dot = false, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-caption font-semibold ring-1 ring-inset', tones[tone].pill, className)}>
      {icon ? <Icon icon={icon} size="xs" /> : dot && <span className={cn('h-1.5 w-1.5 rounded-full', tones[tone].dot)} aria-hidden />}
      {children}
    </span>
  )
}

/** Fixed status-to-tone mapping from docs/DESIGN_SYSTEM.md section 3. Labels always accompany the color. */
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
  PARTIALLY_PAID: { tone: 'warning', label: 'Partially paid' },
  REVIEW: { tone: 'warning', label: 'In review' },
  DUE_SOON: { tone: 'warning', label: 'Due soon' },
  SUBMITTED: { tone: 'warning', label: 'Submitted' },
  PAID: { tone: 'success', label: 'Paid' },
  DONE: { tone: 'success', label: 'Done' },
  COMPLETED: { tone: 'success', label: 'Completed' },
  APPROVED: { tone: 'success', label: 'Approved' },
  SUCCEEDED: { tone: 'success', label: 'Succeeded' },
  OVERDUE: { tone: 'danger', label: 'Overdue' },
  REJECTED: { tone: 'danger', label: 'Rejected' },
  FAILED: { tone: 'danger', label: 'Failed' },
  AT_RISK: { tone: 'danger', label: 'At risk' },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = statusMap[status] ?? { tone: 'neutral' as Tone, label: status }
  return <Badge tone={entry.tone} dot className={className}>{entry.label}</Badge>
}

export function statusTone(status: string): Tone {
  return statusMap[status]?.tone ?? 'neutral'
}
