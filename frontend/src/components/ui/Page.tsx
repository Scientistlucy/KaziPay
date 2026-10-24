import type { ReactNode } from 'react'
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

/** Change vs a named period. Direction is carried by the arrow and sign in ink, not by green or red. */
export function DeltaIndicator({ delta }: { delta: Delta }) {
  const up = delta.value >= 0
  return (
    <span className="inline-flex items-center gap-1 text-caption text-ink-500">
      <span className="tnum inline-flex items-center gap-0.5 font-semibold text-ink-800">
        <Icon icon={up ? MdArrowUpward : MdArrowDownward} size="xs" />
        {up ? '+' : '−'}{Math.abs(delta.value).toFixed(1)}%
      </span>
      {delta.label}
    </span>
  )
}

/** Ledger strip: related figures in one card separated by hairlines, instead of a row of identical tiles. */
export function Figures({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('grid divide-y divide-ink-200 rounded-lg border border-ink-200 bg-white shadow-card sm:auto-cols-fr sm:grid-flow-col sm:divide-x sm:divide-y-0', className)}>
      {children}
    </section>
  )
}

type FigureProps = { label: string; value: ReactNode; detail?: ReactNode; delta?: Delta; alarm?: boolean }

export function Figure({ label, value, detail, delta, alarm = false }: FigureProps) {
  return (
    <div className="px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-overline uppercase text-ink-500">{label}</p>
      <p className={cn('mt-1.5 text-[24px] font-bold leading-8 tracking-[-0.02em]', alarm ? 'text-danger' : 'text-ink-900')}>{value}</p>
      {(delta || detail) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-ink-500">
          {delta && <DeltaIndicator delta={delta} />}
          {detail}
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
