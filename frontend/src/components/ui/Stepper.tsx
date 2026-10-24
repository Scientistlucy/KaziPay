import { Fragment } from 'react'
import { MdCheck } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { statusLabel } from './Badge'
import { Icon } from './Icon'

export type Step = { label: string; description?: string }

/** Numbered stages joined by a hairline. `current` is the zero-based active step; steps before it are done. */
export function Stepper({ steps, current, className, compact = false }: { steps: Step[]; current: number; className?: string; compact?: boolean }) {
  return (
    <ol className={cn('flex items-start', className)}>
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <Fragment key={step.label}>
            <li className="flex min-w-0 flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
              <span className={cn(
                'flex shrink-0 items-center justify-center rounded-full text-caption font-bold transition-colors duration-base',
                compact ? 'h-6 w-6' : 'h-8 w-8',
                done ? 'bg-brand-600 text-white' : active ? 'bg-white text-brand-700 ring-2 ring-brand-600' : 'bg-white text-ink-400 ring-1 ring-ink-300',
              )}>
                {done ? <Icon icon={MdCheck} size={compact ? 'xs' : 'sm'} /> : index + 1}
                <span className="sr-only">{done ? ' (done)' : active ? ' (current)' : ''}</span>
              </span>
              <span className={cn('mt-2 max-w-[120px] text-caption font-semibold', active || done ? 'text-ink-900' : 'text-ink-500')}>{step.label}</span>
              {step.description && !compact && <span className="mt-0.5 hidden max-w-[140px] text-caption text-ink-500 sm:block">{step.description}</span>}
            </li>
            {index < steps.length - 1 && (
              <li aria-hidden className={cn('mx-2 flex-1', compact ? 'mt-3' : 'mt-4')}>
                <div className={cn('h-px w-full', index < current ? 'bg-brand-600' : 'bg-ink-200')} />
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}

const RAIL = ['DRAFT', 'SENT', 'VIEWED', 'PAID'] as const

/** The product's recognition anchor: a four-stage invoice track with its label (docs/DESIGN_SYSTEM.md 1.1). */
export function PaymentRail({ status, className }: { status: string; className?: string }) {
  const reached = status === 'PAID' ? 3 : status === 'PARTIALLY_PAID' ? 2.5 : status === 'OVERDUE' ? 2 : Math.max(0, RAIL.indexOf(status as (typeof RAIL)[number]))
  const overdue = status === 'OVERDUE'
  const voided = status === 'VOID'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex gap-[3px]" aria-hidden>
        {RAIL.map((stage, index) => {
          const filled = !voided && index <= Math.floor(reached)
          const half = !voided && index === Math.ceil(reached) && reached % 1 !== 0
          return (
            <span key={stage} className={cn('relative h-[5px] w-4 overflow-hidden rounded-full', filled ? (overdue ? 'bg-danger' : 'bg-brand-600') : 'bg-ink-200')}>
              {half && <span className="absolute inset-y-0 left-0 w-1/2 bg-brand-600" />}
            </span>
          )
        })}
      </span>
      <span className={cn('whitespace-nowrap text-small font-semibold', overdue ? 'text-danger' : status === 'PAID' ? 'text-brand-700' : voided || status === 'DRAFT' ? 'text-ink-500' : 'text-ink-800')}>
        {statusLabel(status)}
      </span>
    </span>
  )
}
