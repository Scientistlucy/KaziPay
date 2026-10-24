import { cn } from '../../lib/cn'

type ProgressBarProps = { value: number; max?: number; label: string; tone?: 'brand' | 'warning' | 'danger' | 'success'; className?: string; showValue?: boolean }

const fills = { brand: 'bg-brand-600', warning: 'bg-[#D98A1C]', danger: 'bg-danger', success: 'bg-success' }
const tracks = { brand: 'bg-brand-100', warning: 'bg-warning-soft', danger: 'bg-danger-soft', success: 'bg-success-soft' }

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

export function ProgressRing({ value, size = 44, label }: { value: number; size?: number; label: string }) {
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100)
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-brand-100" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="stroke-brand-600 transition-[stroke-dashoffset] duration-slow ease-out" />
      </svg>
      <span className="tnum absolute text-[11px] font-bold text-ink-900">{value}%</span>
    </div>
  )
}
