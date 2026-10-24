import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    // min-w-0 lets a card shrink inside grid and flex layouts so wide content scrolls within it instead of widening the page.
    <div className={cn('min-w-0 rounded-lg border border-ink-200 bg-white shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

type CardHeaderProps = { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string; divider?: boolean }

export function CardHeader({ title, description, actions, className, divider = false }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6', divider ? 'border-b border-ink-200 pb-4' : 'pb-1', className)}>
      <div className="min-w-0">
        <h2 className="text-heading">{title}</h2>
        {description && <p className="mt-0.5 text-small text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4 sm:px-6', className)}>{children}</div>
}

/** Subtle inset surface for grouping inside a card (cards are never nested). */
export function Well({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-md border border-ink-200 bg-ink-25 p-4', className)}>{children}</div>
}
