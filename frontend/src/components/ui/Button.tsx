import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { IconType } from 'react-icons'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'
import { Spinner } from './Spinner'
import { Tooltip } from './Tooltip'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-xs',
  secondary: 'bg-white text-ink-800 border border-ink-300 hover:bg-ink-50 hover:border-ink-400 active:bg-ink-100 shadow-xs',
  tertiary: 'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-800 active:bg-ink-200',
  danger: 'bg-danger text-white hover:bg-danger-hover shadow-xs',
  link: 'bg-transparent text-brand-600 hover:text-brand-700 hover:underline underline-offset-4 px-0 h-auto',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-small gap-1.5',
  md: 'h-10 px-4 text-body gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: IconType
  trailingIcon?: IconType
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', leadingIcon, trailingIcon, loading = false, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-semibold',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out',
        'focus-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        variant !== 'link' && sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : leadingIcon && <Icon icon={leadingIcon} size="sm" />}
      {children}
      {trailingIcon && !loading && <Icon icon={trailingIcon} size="sm" />}
    </button>
  )
})

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconType
  label: string
  variant?: Extract<ButtonVariant, 'secondary' | 'tertiary'>
  size?: 'sm' | 'md'
  tooltip?: boolean
}

/** Icon-only button. Always labelled for assistive tech and, by default, shows the label as a tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'tertiary', size = 'md', tooltip = true, className, type = 'button', ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors duration-fast ease-out focus-ring active:scale-[0.96]',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        variants[variant],
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={size === 'sm' ? 'sm' : 'md'} />
    </button>
  )
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button
})
