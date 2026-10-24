import * as RadixTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export const Tabs = RadixTabs.Root

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixTabs.List className={cn('scrollbar-thin flex gap-1 overflow-x-auto border-b border-ink-200', className)}>
      {children}
    </RadixTabs.List>
  )
}

export function Tab({ value, children, count }: { value: string; children: ReactNode; count?: number }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        'group relative -mb-px inline-flex h-11 items-center gap-2 whitespace-nowrap px-3 text-body font-semibold text-ink-500',
        'rounded-t-md transition-colors duration-fast hover:text-ink-800 focus-ring',
        'data-[state=active]:text-brand-700',
        'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent after:transition-colors after:duration-base',
        'data-[state=active]:after:bg-brand-600',
      )}
    >
      {children}
      {count !== undefined && (
        <span className="tnum rounded-full bg-ink-100 px-1.5 py-px text-caption font-semibold text-ink-600 group-data-[state=active]:bg-brand-50 group-data-[state=active]:text-brand-700">{count}</span>
      )}
    </RadixTabs.Trigger>
  )
}

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return <RadixTabs.Content value={value} className={cn('outline-none focus-visible:shadow-focus', className)}>{children}</RadixTabs.Content>
}

type SegmentedOption<T extends string> = { value: T; label: string; count?: number }

/** Compact single-choice filter (e.g. status). Behaves as a radio group. */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: { options: SegmentedOption<T>[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-ink-200 bg-ink-100/70 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-small font-semibold transition-all duration-base ease-out focus-ring',
              active ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {option.label}
            {option.count !== undefined && <span className={cn('tnum text-caption', active ? 'text-brand-700' : 'text-ink-400')}>{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
