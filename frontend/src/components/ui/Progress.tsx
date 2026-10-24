import { cn } from '../../lib/cn'

type ProgressBarProps = { value: number; max?: number; label: string; tone?: 'brand' | 'danger' | 'muted'; className?: string; showValue?: boolean }

const fills = { brand: 'bg-brand-600', danger: 'bg-danger', muted: 'bg-ink-400' }
const tracks = { brand: 'bg-brand-100', danger: 'bg-danger-soft', muted: 'bg-ink-100' }

export function ProgressBar({ value, max = 100, label, tone = 'brand', className, showValue = false }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('h-1.5 flex-1 overflow-hidden rounded-full', tracks[tone])} role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-[width] duration-slow ease-out', fills[tone])} style={{ width: `${percent}%` }} />
      </div>
      {showValue && <span className="tnum w-9 text-right text-caption font-semibold text-ink-700">{Math.round(percent)}%</span>}
    </div>
  )
}
