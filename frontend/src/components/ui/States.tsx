import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { MdOutlineErrorOutline, MdRefresh, MdSearchOff } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { Icon } from './Icon'

type EmptyStateProps = { icon: IconType; title: string; description: ReactNode; action?: ReactNode; className?: string; compact?: boolean }

export function EmptyState({ icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div className={cn('mx-auto flex max-w-sm flex-col items-center text-center', compact ? 'py-8' : 'py-14', className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-2xl bg-brand-50/60" aria-hidden />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-brand-100 bg-white text-brand-600 shadow-card">
          <Icon icon={icon} size="lg" />
        </div>
      </div>
      <h3 className="text-subheading">{title}</h3>
      <p className="mt-1.5 text-small text-ink-500">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function NoResults({ query, onClear }: { query?: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={MdSearchOff}
      compact
      title={query ? `No results for "${query}"` : 'No matching results'}
      description="Try a different search term or remove some filters."
      action={<Button variant="secondary" size="sm" onClick={onClear}>Clear filters</Button>}
    />
  )
}

type ErrorStateProps = { title?: string; description?: string; onRetry?: () => void; retrying?: boolean; className?: string }

export function ErrorState({ title = 'We couldn’t load this', description = 'Something went wrong on our side. Check your connection and try again.', onRetry, retrying, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
        <Icon icon={MdOutlineErrorOutline} size="lg" />
      </div>
      <div>
        <h3 className="text-subheading">{title}</h3>
        <p className="mt-1 max-w-sm text-small text-ink-500">{description}</p>
      </div>
      {onRetry && <Button variant="secondary" size="sm" leadingIcon={MdRefresh} loading={retrying} onClick={onRetry}>Try again</Button>}
    </div>
  )
}
