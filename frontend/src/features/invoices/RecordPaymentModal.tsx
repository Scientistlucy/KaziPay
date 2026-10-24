import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { formatMoney } from '../../lib/format'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; balance: number; currency: string; invoiceNumber: string }

/** Manual payment recording (cash, bank transfer, cheque) from spec section 3.10. */
export function RecordPaymentModal({ open, onOpenChange, balance, currency, invoiceNumber }: Props) {
  const toast = useToast()
  const schema = z.object({
    amount: z.coerce.number({ invalid_type_error: 'Enter an amount' }).positive('Enter an amount above zero').max(balance, `This invoice only has ${formatMoney(balance, currency)} outstanding`),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'MPESA']),
    reference: z.string().trim().min(1, 'Add a reference so you can match this payment later'),
    paidOn: z.string().min(1, 'Choose the date the money arrived'),
  })
  type Values = z.infer<typeof schema>
  const today = new Date().toISOString().slice(0, 10)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { amount: balance, method: 'BANK_TRANSFER', reference: '', paidOn: today } })

  useEffect(() => { if (open) reset({ amount: balance, method: 'BANK_TRANSFER', reference: '', paidOn: today }) }, [open, balance, reset, today])

  const onSubmit = handleSubmit(async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    onOpenChange(false)
    toast({ title: 'Payment recorded', description: `${formatMoney(values.amount, currency)} applied to ${invoiceNumber}.` })
  })

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!isSubmitting}
      title="Record a payment"
      description={`For money received outside KaziPay. ${formatMoney(balance, currency)} is outstanding on ${invoiceNumber}.`}
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button><Button type="submit" form="payment-form" loading={isSubmitting}>Record payment</Button></>}
    >
      <form id="payment-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" required error={errors.amount?.message}>
            <Input prefix={currency} inputMode="decimal" {...register('amount')} />
          </Field>
          <Field label="Date received" required error={errors.paidOn?.message}>
            <Input type="date" max={today} {...register('paidOn')} />
          </Field>
        </div>
        <Field label="Method" required>
          <Select {...register('method')}>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="MPESA">M-Pesa (paid directly)</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
          </Select>
        </Field>
        <Field label="Reference" required error={errors.reference?.message} help="Bank reference, M-Pesa code or receipt number">
          <Input placeholder="e.g. RTGS-0099812" {...register('reference')} />
        </Field>
      </form>
    </Modal>
  )
}
