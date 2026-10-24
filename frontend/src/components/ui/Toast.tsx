import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { MdCheckCircleOutline, MdClose, MdErrorOutline, MdInfoOutline, MdOutlineWarningAmber } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

type ToastTone = 'success' | 'danger' | 'warning' | 'info'
type ToastInput = { tone?: ToastTone; title: string; description?: string; action?: { label: string; onClick: () => void } }
type ToastItem = ToastInput & { id: number }

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

const toneStyles: Record<ToastTone, { icon: IconType; accent: string; iconColor: string }> = {
  success: { icon: MdCheckCircleOutline, accent: 'before:bg-success', iconColor: 'text-success' },
  danger: { icon: MdErrorOutline, accent: 'before:bg-danger', iconColor: 'text-danger' },
  warning: { icon: MdOutlineWarningAmber, accent: 'before:bg-[#D98A1C]', iconColor: 'text-warning' },
  info: { icon: MdInfoOutline, accent: 'before:bg-brand-600', iconColor: 'text-brand-600' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const push = useCallback((toast: ToastInput) => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-2), { tone: 'success', ...toast, id }])
  }, [])
  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:items-end"
      >
        {toasts.map((toast) => <ToastCard key={toast.id} toast={toast} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, dismiss }: { toast: ToastItem; dismiss: (id: number) => void }) {
  const tone = toneStyles[toast.tone ?? 'success']
  const onDismiss = () => dismiss(toast.id)
  useEffect(() => {
    // Errors stay until dismissed so they cannot be missed.
    if (toast.tone === 'danger') return
    const timer = window.setTimeout(() => dismiss(toast.id), 5000)
    return () => window.clearTimeout(timer)
  }, [toast.tone, toast.id, dismiss])

  return (
    <div
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto relative flex w-full max-w-[360px] gap-3 overflow-hidden rounded-lg border border-ink-200 bg-white py-3.5 pl-4 pr-3 shadow-pop animate-toast-in',
        'before:absolute before:inset-y-0 before:left-0 before:w-[3px]',
        tone.accent,
      )}
    >
      <Icon icon={tone.icon} size="md" className={tone.iconColor} />
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold text-ink-900">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-small text-ink-500">{toast.description}</p>}
        {toast.action && (
          <button type="button" onClick={() => { toast.action!.onClick(); onDismiss() }} className="mt-1.5 text-small font-semibold text-brand-600 hover:text-brand-700 focus-ring rounded-sm">
            {toast.action.label}
          </button>
        )}
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss} className="h-7 w-7 shrink-0 rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-ring">
        <Icon icon={MdClose} size="sm" className="mx-auto" />
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
