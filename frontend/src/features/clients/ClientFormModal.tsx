import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { useSaveClient } from '../../lib/queries'
import type { Client } from '../../types'

// Mirrors ClientDtos.ClientRequest validation in the backend.
const optionalEmail = z.string().trim().email('Enter a valid email address, like name@company.co.ke').or(z.literal(''))
const schema = z.object({
  name: z.string().trim().min(1, 'Client name is required').max(255, 'Keep the name under 255 characters'),
  industry: z.string().trim().max(100),
  email: optionalEmail,
  phone: z.string().trim().max(30, 'Phone numbers can be at most 30 characters'),
  billingEmail: optionalEmail,
  address: z.string().trim(),
  country: z.string().trim(),
  taxId: z.string().trim().max(50, 'Tax IDs can be at most 50 characters'),
  defaultCurrency: z.string().regex(/^[A-Z]{3}$/, 'Choose a currency'),
  paymentTermsDays: z.coerce.number({ invalid_type_error: 'Enter a number of days' }).int('Use whole days').min(0, 'Terms cannot be negative').max(365, 'Use 365 days or fewer'),
  notes: z.string().trim(),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = { name: '', industry: '', email: '', phone: '', billingEmail: '', address: '', country: 'Kenya', taxId: '', defaultCurrency: 'KES', paymentTermsDays: 14, notes: '' }

function toValues(client?: Client): FormValues {
  if (!client) return empty
  return {
    name: client.name, industry: client.industry, email: client.email ?? '', phone: client.phone ?? '', billingEmail: client.billingEmail ?? '',
    address: client.address ?? '', country: client.country ?? '', taxId: client.taxId ?? '', defaultCurrency: client.defaultCurrency,
    paymentTermsDays: client.paymentTermsDays, notes: client.notes ?? '',
  }
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void; client?: Client; onSaved?: (client: Client) => void }

export function ClientFormModal({ open, onOpenChange, client, onSaved }: Props) {
  const toast = useToast()
  const save = useSaveClient()
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(client),
    mode: 'onBlur',
  })

  useEffect(() => { if (open) reset(toValues(client)) }, [open, client, reset])

  const requestClose = (next: boolean) => {
    if (next) return onOpenChange(true)
    if (isDirty && !save.isPending) setConfirmDiscard(true)
    else onOpenChange(false)
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: client?.id, input: { ...values, company: values.name } })
      toast({ title: client ? 'Client updated' : `${saved.name} added`, description: client ? 'Your changes are saved.' : 'You can now create projects and invoices for this client.' })
      onOpenChange(false)
      onSaved?.(saved)
    } catch {
      toast({ tone: 'danger', title: 'Couldn’t save the client', description: 'Check your connection and try again. Nothing was lost.' })
    }
  })

  return (
    <>
      <Modal
        open={open}
        onOpenChange={requestClose}
        dismissible={!save.isPending}
        title={client ? `Edit ${client.name}` : 'New client'}
        description={client ? 'Changes apply to future invoices. Sent invoices keep the details they were issued with.' : 'Add the details you need to invoice this client. You can change them later.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => requestClose(false)} disabled={save.isPending}>Cancel</Button>
            <Button type="submit" form="client-form" loading={save.isPending}>{client ? 'Save changes' : 'Add client'}</Button>
          </>
        }
      >
        <form id="client-form" onSubmit={onSubmit} noValidate className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="mb-1 text-overline uppercase text-ink-500">Client</legend>
            <Field label="Client or company name" required error={errors.name?.message}>
              <Input placeholder="e.g. Savanna Logistics Ltd" autoFocus {...register('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" optional error={errors.email?.message}>
                <Input type="email" placeholder="accounts@company.co.ke" {...register('email')} />
              </Field>
              <Field label="Phone" optional error={errors.phone?.message}>
                <Input type="tel" placeholder="+254 7XX XXX XXX" {...register('phone')} />
              </Field>
            </div>
            <Field label="Industry" optional>
              <Input placeholder="e.g. Logistics" {...register('industry')} />
            </Field>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 text-overline uppercase text-ink-500">Billing</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default currency" required error={errors.defaultCurrency?.message}>
                <Select {...register('defaultCurrency')}>
                  {['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'].map((code) => <option key={code} value={code}>{code}</option>)}
                </Select>
              </Field>
              <Field label="Payment terms" required error={errors.paymentTermsDays?.message} help="Days until an invoice is due">
                <Input type="number" inputMode="numeric" min={0} trailing={<span className="pr-2 text-small text-ink-500">days</span>} {...register('paymentTermsDays')} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Billing email" optional error={errors.billingEmail?.message} help="Invoices are sent here">
                <Input type="email" placeholder="finance@company.co.ke" {...register('billingEmail')} />
              </Field>
              <Field label="KRA PIN or tax ID" optional error={errors.taxId?.message}>
                <Input placeholder="P051234567X" {...register('taxId')} />
              </Field>
            </div>
            <Field label="Billing address" optional>
              <Textarea rows={2} placeholder="Building, street, town" {...register('address')} />
            </Field>
          </fieldset>

          <Field label="Internal notes" optional help="Only your team sees these">
            <Textarea rows={2} placeholder="e.g. Requires a PO number on every invoice" {...register('notes')} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You’ve edited this client. If you leave now, your changes will be lost."
        confirmLabel="Discard changes"
        onConfirm={() => { setConfirmDiscard(false); reset(toValues(client)); onOpenChange(false) }}
      />
    </>
  )
}
