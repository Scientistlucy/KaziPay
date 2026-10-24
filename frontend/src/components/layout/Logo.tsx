import { cn } from '../../lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="rgb(var(--brand-600))" />
      <path d="M11 8.5v15M11 16.5l7.5-8M13.6 13.8 21 23.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="22.5" cy="9.5" r="2" fill="rgb(var(--brand-200))" />
    </svg>
  )
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className={cn('text-[17px] font-bold tracking-[-0.02em]', inverted ? 'text-white' : 'text-ink-900')}>KaziPay</span>
    </span>
  )
}
