import {
  cloneElement, forwardRef, isValidElement, useId,
  type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import type { IconType } from 'react-icons'
import { MdErrorOutline, MdExpandMore } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

const controlBase = cn(
  'w-full rounded-md border bg-white text-body text-ink-900 shadow-xs placeholder:text-ink-400',
  'transition-[border-color,box-shadow] duration-fast ease-out outline-none',
  'hover:border-ink-400 focus:border-brand-600 focus:shadow-focus',
  'disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400 disabled:hover:border-ink-300',
)
const controlError = 'border-danger hover:border-danger focus:border-danger focus:shadow-focus-danger'

type FieldProps = {
  label: string
  children: ReactElement<{ id?: string; invalid?: boolean; 'aria-describedby'?: string; 'aria-required'?: boolean }>
  help?: ReactNode
  error?: string
  required?: boolean
  optional?: boolean
  className?: string
  trailingLabel?: ReactNode
}

/** Label, control, helper text and inline error, wired together for assistive tech. */
export function Field({ label, children, help, error, required, optional, className, trailingLabel }: FieldProps) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children, { id, invalid: Boolean(error), 'aria-describedby': describedBy, 'aria-required': required || undefined })
    : children

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-small font-semibold text-ink-800">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          {optional && <span className="ml-1.5 font-normal text-ink-500">(optional)</span>}
        </label>
        {trailingLabel}
      </div>
      {control}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-small text-danger" role="alert">
          <Icon icon={MdErrorOutline} size="xs" />
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="text-small text-ink-500">{help}</p>
      ) : null}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leadingIcon?: IconType; prefix?: string; trailing?: ReactNode }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leadingIcon, prefix, trailing, className, ...rest },
  ref,
) {
  const hasAdornment = Boolean(leadingIcon || prefix || trailing)
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'h-10 px-3', invalid && controlError, leadingIcon && 'pl-9', prefix && 'pl-14', trailing && 'pr-10', !hasAdornment && className)}
      {...rest}
    />
  )
  if (!hasAdornment) return input
  return (
    <div className={cn('relative', className)}>
      {leadingIcon && <Icon icon={leadingIcon} size="sm" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />}
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center border-r border-ink-200 text-small font-medium text-ink-600">
          {prefix}
        </span>
      )}
      {input}
      {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
    </div>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(controlBase, 'min-h-[88px] px-3 py-2.5', invalid && controlError, className)} {...rest} />
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }

/** Native select styled to match inputs: fully keyboard and screen-reader accessible on every platform. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <div className={cn('relative', className)}>
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(controlBase, 'h-10 appearance-none pl-3 pr-9', invalid && controlError)} {...rest}>
        {children}
      </select>
      <Icon icon={MdExpandMore} size="md" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
    </div>
  )
})

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: ReactNode; description?: ReactNode }

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, ...rest }, ref) {
  const box = (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-ink-300 text-brand-600 accent-brand-600',
        'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed',
        !label && className,
      )}
      {...rest}
    />
  )
  if (!label) return box
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', className)}>
      <span className="mt-[3px]">{box}</span>
      <span>
        <span className="block text-body font-medium text-ink-800">{label}</span>
        {description && <span className="block text-small text-ink-500">{description}</span>}
      </span>
    </label>
  )
})

type SwitchProps = { checked: boolean; onCheckedChange: (checked: boolean) => void; label: string; description?: string; disabled?: boolean }

export function Switch({ checked, onCheckedChange, label, description, disabled }: SwitchProps) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="block cursor-pointer text-body font-medium text-ink-800">{label}</label>
        {description && <p className="text-small text-ink-500">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-base ease-out focus-ring',
          checked ? 'bg-brand-600' : 'bg-ink-300',
          'disabled:opacity-50',
        )}
      >
        <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-base ease-out', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}
