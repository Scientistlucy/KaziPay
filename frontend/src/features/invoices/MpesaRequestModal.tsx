import { useEffect, useRef, useState } from 'react'
import { MdCheck, MdCheckCircle, MdErrorOutline, MdOutlinePhoneIphone } from 'react-icons/md'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../lib/cn'
import { formatMoney } from '../../lib/format'

type Stage = 'form' | 'sending' | 'waiting' | 'success' | 'failed'
type Props = { open: boolean; onOpenChange: (open: boolean) => void; amount: number; invoiceNumber: string; defaultPhone?: string }

const TIMEOUT = 60
const steps = ['Sending prompt', 'Check your phone', 'Enter M-Pesa PIN']

/**
 * STK Push flow from spec section 15: steps, a 60-second countdown, then success or retry.
 * Simulated until Step 10. A number ending in 0000 simulates a cancelled payment.
 */
export function MpesaRequestModal({ open, onOpenChange, amount, invoiceNumber, defaultPhone = '' }: Props) {
  const toast = useToast()
  const [phone, setPhone] = useState(defaultPhone.replace(/^\+254\s?/, '').replace(/\D/g, '').slice(-9))
  const [error, setError] = useState<string>()
  const [stage, setStage] = useState<Stage>('form')
  const [remaining, setRemaining] = useState(TIMEOUT)
  const timers = useRef<number[]>([])

  const clearTimers = () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = [] }
  useEffect(() => () => clearTimers(), [])
  useEffect(() => { if (!open) { clearTimers(); setStage('form'); setRemaining(TIMEOUT); setError(undefined) } }, [open])

  useEffect(() => {
    if (stage !== 'waiting') return
    const interval = window.setInterval(() => setRemaining((r) => {
      if (r <= 1) { window.clearInterval(interval); setStage('failed'); return 0 }
      return r - 1
    }), 1000)
    return () => window.clearInterval(interval)
  }, [stage])

  const send = () => {
    if (!/^(7|1)\d{8}$/.test(phone)) { setError('Enter a Safaricom number like 712 345 678'); return }
    setError(undefined)
    setStage('sending')
    setRemaining(TIMEOUT)
    timers.current.push(window.setTimeout(() => setStage('waiting'), 1400))
    timers.current.push(window.setTimeout(() => setStage(phone.endsWith('0000') ? 'failed' : 'success'), 7000))
  }

  const stepIndex = stage === 'sending' ? 0 : stage === 'waiting' ? (remaining > TIMEOUT - 3 ? 1 : 2) : stage === 'success' ? 3 : -1
  const busy = stage === 'sending' || stage === 'waiting'

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      dismissible={!busy}
      title={stage === 'success' ? 'Payment received' : 'Request M-Pesa payment'}
      description={stage === 'form' ? `Your client gets a prompt on their phone to pay ${invoiceNumber}.` : undefined}
      footer={
        stage === 'form' ? (
          <><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={send}>Send prompt</Button></>
        ) : stage === 'failed' ? (
          <><Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button><Button onClick={send}>Try again</Button></>
        ) : stage === 'success' ? (
          <Button onClick={() => { onOpenChange(false); toast({ title: 'Invoice updated', description: `${formatMoney(amount)} recorded against ${invoiceNumber}.` }) }}>Done</Button>
        ) : (
          <Button variant="secondary" onClick={() => { clearTimers(); setStage('form') }}>Cancel request</Button>
        )
      }
    >
      <div className="mb-5 flex items-center justify-between rounded-lg bg-ink-25 px-4 py-3">
        <span className="text-small text-ink-500">Amount</span>
        <span className="tnum text-heading text-ink-900">{formatMoney(amount)}</span>
      </div>

      {stage === 'form' && (
        <Field label="Client’s M-Pesa number" required error={error} help="Safaricom numbers only. We never store the PIN.">
          <Input prefix="+254" inputMode="numeric" value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 9)); setError(undefined) }} placeholder="712 345 678" autoFocus />
        </Field>
      )}

      {busy && (
        <div className="flex flex-col items-center text-center" aria-live="polite">
          <Countdown remaining={remaining} active={stage === 'waiting'} />
          <ol className="mt-6 w-full space-y-3">
            {steps.map((step, index) => {
              const done = index < stepIndex
              const current = index === stepIndex
              return (
                <li key={step} className="flex items-center gap-3 text-left">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold transition-colors duration-base',
                    done ? 'bg-brand-600 text-white' : current ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-600' : 'bg-ink-100 text-ink-400')}>
                    {done ? <Icon icon={MdCheck} size="xs" /> : index + 1}
                  </span>
                  <span className={cn('text-small', current ? 'font-semibold text-ink-900' : done ? 'text-ink-600' : 'text-ink-400')}>{step}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {stage === 'success' && (
        <div className="flex flex-col items-center py-2 text-center" role="status">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white animate-content-in"><Icon icon={MdCheckCircle} size="lg" /></span>
          <p className="mt-4 text-subheading text-ink-900">Paid by +254 {phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}</p>
          <p className="mt-1 text-small text-ink-500">M-Pesa receipt <span className="font-semibold text-ink-800">SKL7Q2M4XD</span> · the invoice has been settled.</p>
        </div>
      )}

      {stage === 'failed' && (
        <div className="flex flex-col items-center py-2 text-center" role="alert">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger"><Icon icon={MdErrorOutline} size="lg" /></span>
          <p className="mt-4 text-subheading text-ink-900">{remaining === 0 ? 'The request timed out' : 'The payment was cancelled'}</p>
          <p className="mt-1 max-w-xs text-small text-ink-500">No money was taken. Check the number is correct and the phone is on, then try again.</p>
        </div>
      )}
    </Modal>
  )
}

function Countdown({ remaining, active }: { remaining: number; active: boolean }) {
  const size = 112
  const radius = 50
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative" style={{ width: size, height: size }} role="timer" aria-label={`${remaining} seconds remaining`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={6} className="stroke-brand-100" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={6} strokeLinecap="round" className="stroke-brand-600 transition-[stroke-dashoffset] duration-1000 ease-linear"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - remaining / TIMEOUT)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {active ? <><span className="tnum text-[26px] font-bold leading-none text-ink-900">{remaining}</span><span className="mt-1 text-caption text-ink-500">seconds</span></> : <Icon icon={MdOutlinePhoneIphone} size="lg" className="text-brand-600" />}
      </div>
    </div>
  )
}
