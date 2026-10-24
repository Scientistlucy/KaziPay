import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { MdClose, MdOutlineWarningAmber } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { Icon } from './Icon'

const widths = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[560px]', lg: 'sm:max-w-[760px]' }

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  size?: keyof typeof widths
  children?: ReactNode
  footer?: ReactNode
  /** Blocks Escape and outside clicks, e.g. while a submission is in flight. */
  dismissible?: boolean
}

/** Centered dialog on desktop, bottom sheet on mobile. Radix handles focus trapping and returns focus to the trigger. */
export function Modal({ open, onOpenChange, title, description, size = 'md', children, footer, dismissible = true }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (dismissible || next) && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink-900/45 backdrop-blur-[2px] animate-overlay-in" />
        <Dialog.Content
          onEscapeKeyDown={(event) => !dismissible && event.preventDefault()}
          onPointerDownOutside={(event) => !dismissible && event.preventDefault()}
          className={cn(
            'fixed z-50 flex max-h-[92vh] w-full flex-col bg-white shadow-modal outline-none',
            'inset-x-0 bottom-0 rounded-t-xl animate-sheet-in',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:animate-content-in',
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
            <div>
              <Dialog.Title className="text-heading text-ink-900">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-small text-ink-500">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            {dismissible && (
              <Dialog.Close asChild>
                <button type="button" aria-label="Close" className="-mr-2 -mt-1 rounded-md p-1.5 text-ink-400 transition-colors duration-fast hover:bg-ink-100 hover:text-ink-700 focus-ring">
                  <Icon icon={MdClose} size="md" />
                </button>
              </Dialog.Close>
            )}
          </div>
          {children && <div className="scrollbar-thin overflow-y-auto px-6 py-4">{children}</div>}
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-ink-200 bg-ink-25 px-6 py-4 sm:flex-row sm:justify-end sm:rounded-b-xl">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  tone?: 'danger' | 'primary'
}

/** For destructive or irreversible actions only. The confirm button names the action. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, loading = false, tone = 'danger' }: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink-900/45 backdrop-blur-[2px] animate-overlay-in" />
        <Dialog.Content
          role="alertdialog"
          className={cn(
            'fixed z-50 w-full bg-white p-6 shadow-modal outline-none',
            'inset-x-0 bottom-0 rounded-t-xl animate-sheet-in',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:animate-content-in',
          )}
        >
          <div className="flex gap-4">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-brand-50 text-brand-600')}>
              <Icon icon={MdOutlineWarningAmber} size="md" />
            </div>
            <div>
              <Dialog.Title className="text-subheading text-ink-900">{title}</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-small text-ink-600">{description}</Dialog.Description>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button variant="secondary" disabled={loading}>Cancel</Button>
            </Dialog.Close>
            <Button variant={tone} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
