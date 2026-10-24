import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-caption', md: 'h-10 w-10 text-small', lg: 'h-14 w-14 text-subheading' } as const

// Tints stay inside the blue family so avatars never introduce off-brand colors.
const tints = ['bg-brand-100 text-brand-800', 'bg-brand-50 text-brand-700', 'bg-ink-100 text-ink-700', 'bg-brand-200 text-brand-900']

function tintFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return tints[hash % tints.length]
}

type AvatarProps = { name: string; size?: keyof typeof sizes; className?: string; square?: boolean }

export function Avatar({ name, size = 'sm', className, square = false }: AvatarProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 select-none items-center justify-center font-semibold', square ? 'rounded-md' : 'rounded-full', sizes[size], tintFor(name), className)}
      aria-hidden
      title={name}
    >
      {initials(name)}
    </span>
  )
}

export function AvatarGroup({ names, max = 3, size = 'sm' }: { names: string[]; max?: number; size?: keyof typeof sizes }) {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <div className="flex items-center -space-x-1" aria-label={names.join(', ')} role="img">
      {shown.map((name) => <Avatar key={name} name={name} size={size} className="ring-2 ring-white" />)}
      {rest > 0 && (
        <span className={cn('inline-flex items-center justify-center rounded-full bg-ink-100 font-semibold text-ink-600 ring-2 ring-white', sizes[size])}>+{rest}</span>
      )}
    </div>
  )
}
