import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { MdArrowDownward, MdArrowUpward, MdSearch } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'
import { Input } from './Field'

type PageHeaderProps = { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; className?: string }

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-title">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-body text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function PageContainer({ children, className, width = 'wide' }: { children: ReactNode; className?: string; width?: 'wide' | 'narrow' }) {
  return (
    <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8', width === 'wide' ? 'max-w-[1280px]' : 'max-w-[880px]', className)}>
      {children}
    </div>
  )
}

type Delta = { value: number; label: string; positiveIsGood?: boolean }

export function DeltaIndicator({ delta }: { delta: Delta }) {
  const up = delta.value >= 0
  const good = up === (delta.positiveIsGood ?? true)
  return (
    <span className="inline-flex items-center gap-1 text-caption">
      <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold', good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
        <Icon icon={up ? MdArrowUpward : MdArrowDownward} size="xs" />
        <span className="tnum">{up ? '+' : '−'}{Math.abs(delta.value).toFixed(1)}%</span>
      </span>
      <span className="text-ink-500">{delta.label}</span>
    </span>
  )
}

type StatTileProps = { label: string; value: ReactNode; icon?: IconType; delta?: Delta; footnote?: ReactNode; emphasis?: 'default' | 'danger' }

/** KPI tile: sentence-case label, proportional-figure value, optional delta vs a named period. */
export function StatTile({ label, value, icon, delta, footnote, emphasis = 'default' }: StatTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-medium text-ink-500">{label}</p>
        {icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', emphasis === 'danger' ? 'bg-danger-soft text-danger' : 'bg-brand-50 text-brand-600')}>
            <Icon icon={icon} size="sm" />
          </span>
        )}
      </div>
      <p className="text-[26px] font-bold leading-8 tracking-[-0.02em] text-ink-900">{value}</p>
      {(delta || footnote) && (
        <div className="flex flex-wrap items-center gap-2">
          {delta && <DeltaIndicator delta={delta} />}
          {footnote && <span className="text-caption text-ink-500">{footnote}</span>}
        </div>
      )}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder, label, className }: { value: string; onChange: (value: string) => void; placeholder: string; label: string; className?: string }) {
  return (
    <Input
      type="search"
      aria-label={label}
      leadingIcon={MdSearch}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn('w-full sm:w-72', className)}
    />
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-ink-200 bg-ink-25 px-1 font-sans text-[11px] font-semibold text-ink-500', className)}>{children}</kbd>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-overline uppercase text-ink-500">{children}</p>
}
