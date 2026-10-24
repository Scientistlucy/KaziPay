import type { IconType } from 'react-icons'
import { cn } from '../../lib/cn'

const sizes = { xs: 14, sm: 16, md: 20, lg: 24 } as const
export type IconSize = keyof typeof sizes

type IconProps = { icon: IconType; size?: IconSize; className?: string; label?: string }

/** Renders a Material icon at a design-system size. Decorative unless `label` is given. */
export function Icon({ icon: Glyph, size = 'sm', className, label }: IconProps) {
  return (
    <Glyph
      size={sizes[size]}
      className={cn('shrink-0', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable={false}
    />
  )
}
