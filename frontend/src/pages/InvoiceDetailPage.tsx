import { useState } from 'react'
import {
  MdArrowBack, MdMoreHoriz, MdOutlineBlock, MdOutlineContentCopy, MdOutlineFileDownload, MdOutlinePayments, MdOutlinePhoneIphone, MdOutlineSend,
} from 'react-icons/md'
import { Link, useParams } from 'react-router-dom'
import { LogoMark } from '../components/layout/Logo'
import { StatusBadge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/Modal'
import { Menu, MenuItem, MenuSeparator } from '../components/ui/Menu'
import { PageContainer } from '../components/ui/Page'
import { ProgressBar } from '../components/ui/Progress'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/States'
import { Stepper } from '../components/ui/Stepper'
import { useToast } from '../components/ui/Toast'
import { MpesaRequestModal } from '../features/invoices/MpesaRequestModal'
import { RecordPaymentModal } from '../features/invoices/RecordPaymentModal'
import { cn } from '../lib/cn'
import { formatDate, formatMoney } from '../lib/format'
import { dueLabel, invoiceTotals } from '../lib/invoice'
import { useClient, useInvoice, useInvoiceAction, usePayments, useWorkspace } from '../lib/queries'
import type { Invoice } from '../types'

export function InvoiceDetailPage() {
  const { invoiceId = '' } = useParams()
  const invoice = useInvoice(invoiceId)
  return (
    <PageContainer>
      <Link to="/invoices" className="mb-5 inline-flex items-center gap-1.5 rounded-sm text-small font-semibold text-ink-500 hover:text-ink-800 focus-ring">
        <Icon icon={MdArrowBack} size="sm" /> Invoices
      </Link>
      {invoice.isPending ? (
        <LoadingRegion label="Loading invoice" className="grid gap-6 lg:grid-cols-12"><Skeleton className="h-[720px] rounded-lg lg:col-span-8" /><Skeleton className="h-80 rounded-lg lg:col-span-4" /></LoadingRegion>
      ) : invoice.isError ? (
        <Card><ErrorState title="We couldn’t find this invoice" description="It may have been removed, or the link is wrong." /></Card>
      ) : <InvoiceDetail invoice={invoice.data} />}
    </PageContainer>
  )
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const toast = useToast()
  const send = useInvoiceAction('send')
  const voidInvoice = useInvoiceAction('void')
  const { data: client } = useClient(invoice.clientId)
  const { data: payments } = usePayments()
  const [mpesaOpen, setMpesaOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const totals = invoiceTotals(invoice)
  const invoicePayments = payments?.filter((p) => p.invoiceId === invoice.id) ?? []
  const payable = !['DRAFT', 'PAID', 'VOID'].includes(invoice.status)

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5"><h1 className="text-title">{invoice.number}</h1><StatusBadge status={invoice.status} /></div>
          <p className="mt-0.5 text-body text-ink-500">
            <Link to={`/clients/${invoice.clientId}`} className="rounded-sm font-semibold text-brand-600 hover:text-brand-700 focus-ring">{invoice.clientName}</Link>
            {invoice.projectName && ` · ${invoice.projectName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leadingIcon={MdOutlineFileDownload} onClick={() => toast({ tone: 'info', title: 'PDF download arrives with Step 9' })}>PDF</Button>
          {invoice.status === 'DRAFT' ? (
            <Button leadingIcon={MdOutlineSend} loading={send.isPending} onClick={() => send.mutate(invoice.id, { onSuccess: () => toast({ title: `${invoice.number} sent`, description: `Emailed to ${client?.billingEmail ?? invoice.clientName} with a secure pay link.` }) })}>Send invoice</Button>
          ) : payable ? (
            <Button leadingIcon={MdOutlinePhoneIphone} onClick={() => setMpesaOpen(true)}>Request M-Pesa payment</Button>
          ) : null}
          <Menu trigger={<IconButton icon={MdMoreHoriz} label="More actions" variant="secondary" />}>
            {payable && <MenuItem icon={MdOutlinePayments} onSelect={() => setRecordOpen(true)}>Record manual payment</MenuItem>}
            <MenuItem icon={MdOutlineContentCopy} onSelect={() => {
              const link = `https://mwangaza.kazipay.app/pay/${invoice.id}`
              const copy = navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject(new Error('Clipboard unavailable'))
              copy
                .then(() => toast({ title: 'Pay link copied', description: 'Share it with your client by WhatsApp or email.' }))
                .catch(() => toast({ tone: 'info', title: 'Couldn’t copy automatically', description: link }))
            }}>Copy pay link</MenuItem>
            {invoice.status !== 'VOID' && invoice.status !== 'PAID' && (<><MenuSeparator /><MenuItem icon={MdOutlineBlock} danger onSelect={() => setVoidOpen(true)}>Void invoice</MenuItem></>)}
          </Menu>
        </div>
      </header>

      <Lifecycle invoice={invoice} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <InvoiceDocument invoice={invoice} clientTaxId={client?.taxId} clientAddress={client?.address} />
        </div>

        <aside className="min-w-0 space-y-5 lg:col-span-4">
          <Card className="p-6">
            <p className="text-overline uppercase text-ink-500">{invoice.status === 'PAID' ? 'Paid in full' : 'Balance due'}</p>
            <p className={cn('tnum mt-1.5 text-[30px] font-bold leading-9 tracking-[-0.02em]', invoice.status === 'OVERDUE' ? 'text-danger' : 'text-ink-900')}>{formatMoney(invoice.status === 'PAID' ? totals.total : totals.balance, invoice.currency)}</p>
            {invoice.status !== 'VOID' && (
              <>
                <ProgressBar className="mt-5" value={Math.min(invoice.amountPaid, totals.total)} max={totals.total} label="Share of invoice paid" />
                <div className="mt-2 flex justify-between text-caption text-ink-500">
                  <span className="tnum">{formatMoney(Math.min(invoice.amountPaid, totals.total), invoice.currency)} paid</span>
                  <span className={cn(invoice.status === 'OVERDUE' && 'font-semibold text-danger')}>{payable ? dueLabel(invoice.dueDate) : `Due ${formatDate(invoice.dueDate)}`}</span>
                </div>
              </>
            )}
            {payable && <Button variant="secondary" fullWidth className="mt-5" leadingIcon={MdOutlinePayments} onClick={() => setRecordOpen(true)}>Record a payment received elsewhere</Button>}
          </Card>

          <Card>
            <CardHeader title="Payments" description={invoicePayments.length ? undefined : 'No payments yet'} />
            {invoicePayments.length > 0 && (
              <ul className="divide-y divide-ink-200 px-5 pb-2 sm:px-6">
                {invoicePayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-small font-semibold text-ink-900">{payment.method === 'MPESA' ? 'M-Pesa' : payment.method === 'BANK_TRANSFER' ? 'Bank transfer' : payment.method === 'CASH' ? 'Cash' : 'Card'}</p>
                      <p className="truncate text-caption text-ink-500">{payment.reference} · {formatDate(payment.paidAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-small font-semibold text-ink-900">{formatMoney(payment.amount, payment.currency)}</p>
                      <StatusBadge status={payment.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {invoicePayments.length === 0 && <div className="h-3" />}
          </Card>
        </aside>
      </div>

      <MpesaRequestModal open={mpesaOpen} onOpenChange={setMpesaOpen} amount={totals.balance} invoiceNumber={invoice.number} defaultPhone={client?.phone} />
      <RecordPaymentModal open={recordOpen} onOpenChange={setRecordOpen} balance={totals.balance} currency={invoice.currency} invoiceNumber={invoice.number} />
      <ConfirmDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title={`Void ${invoice.number}?`}
        description="The invoice stays on record but can no longer be paid. This can’t be undone. To correct a sent invoice, issue a credit note instead."
        confirmLabel="Void invoice"
        loading={voidInvoice.isPending}
        onConfirm={() => voidInvoice.mutate(invoice.id, { onSuccess: () => { setVoidOpen(false); toast({ title: `${invoice.number} voided` }) } })}
      />
    </>
  )
}

function InvoiceDocument({ invoice, clientTaxId, clientAddress }: { invoice: Invoice; clientTaxId?: string; clientAddress?: string }) {
  const { data: workspace } = useWorkspace()
  const totals = invoiceTotals(invoice)
  return (
    <article aria-label={`Invoice ${invoice.number}`} className="relative overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card">
      <div className="h-1.5 bg-brand-600" aria-hidden />
      {invoice.status === 'PAID' && (
        <div className="pointer-events-none absolute right-8 top-24 rotate-[-12deg] rounded-md border-[3px] border-brand-600/35 px-4 py-1 text-[22px] font-extrabold uppercase tracking-[0.15em] text-brand-600/45" aria-hidden>Paid</div>
      )}
      <div className="p-6 sm:p-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <LogoMark className="h-10 w-10" />
            <p className="mt-3 text-subheading text-ink-900">{workspace?.name}</p>
            <p className="text-small leading-6 text-ink-500">{workspace?.address}<br />{workspace?.businessEmail} · {workspace?.businessPhone}<br />KRA PIN {workspace?.taxId}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-overline uppercase tracking-[0.2em] text-ink-400">Invoice</p>
            <p className="mt-1 text-title text-ink-900">{invoice.number}</p>
            <dl className="mt-3 grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-small sm:justify-end">
              <dt className="text-ink-500">Issued</dt><dd className="text-ink-800">{formatDate(invoice.issueDate)}</dd>
              <dt className="text-ink-500">Due</dt><dd className="font-semibold text-ink-900">{formatDate(invoice.dueDate)}</dd>
            </dl>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-overline uppercase text-ink-400">Bill to</p>
            <p className="mt-2 font-semibold text-ink-900">{invoice.clientName}</p>
            <p className="text-small leading-6 text-ink-500">{clientAddress}{clientTaxId && <><br />KRA PIN {clientTaxId}</>}</p>
          </div>
          {invoice.projectName && (
            <div className="sm:text-right">
              <p className="text-overline uppercase text-ink-400">Project</p>
              <p className="mt-2 font-semibold text-ink-900">{invoice.projectName}</p>
            </div>
          )}
        </div>

        <div className="scrollbar-thin mt-10 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b-2 border-ink-900 text-overline uppercase text-ink-500">
                <th scope="col" className="pb-3">Description</th>
                <th scope="col" className="w-20 pb-3 text-right">Qty</th>
                <th scope="col" className="w-32 pb-3 text-right">Rate</th>
                <th scope="col" className="w-36 pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-ink-200">
                  <td className="py-4 pr-4"><p className="font-medium text-ink-900">{item.description}</p><p className="text-caption text-ink-500">VAT {item.taxRate}%</p></td>
                  <td className="tnum py-4 text-right text-ink-700">{item.quantity}</td>
                  <td className="tnum py-4 text-right text-ink-700">{formatMoney(item.unitPrice, invoice.currency)}</td>
                  <td className="tnum py-4 text-right font-semibold text-ink-900">{formatMoney(item.quantity * item.unitPrice, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="tnum w-full max-w-[300px] space-y-2.5 text-small">
            <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd className="text-ink-800">{formatMoney(totals.subtotal, invoice.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">VAT (16%)</dt><dd className="text-ink-800">{formatMoney(totals.tax, invoice.currency)}</dd></div>
            <div className="flex justify-between border-t border-ink-200 pt-2.5 text-body"><dt className="font-semibold text-ink-900">Total</dt><dd className="font-semibold text-ink-900">{formatMoney(totals.total, invoice.currency)}</dd></div>
            {invoice.amountPaid > 0 && <div className="flex justify-between"><dt className="text-ink-500">Paid</dt><dd className="text-ink-800">−{formatMoney(Math.min(invoice.amountPaid, totals.total), invoice.currency)}</dd></div>}
            <div className="flex items-baseline justify-between rounded-md bg-brand-50 px-3 py-2.5"><dt className="font-semibold text-brand-900">Balance due</dt><dd className="text-heading text-brand-900">{formatMoney(totals.balance, invoice.currency)}</dd></div>
          </dl>
        </div>

        {invoice.notes && (
          <div className="mt-10 border-t border-ink-200 pt-6">
            <p className="text-overline uppercase text-ink-400">Payment details</p>
            <p className="mt-2 max-w-lg text-small leading-6 text-ink-600">{invoice.notes}</p>
          </div>
        )}
      </div>
    </article>
  )
}

/** The invoice's journey as a stepper: the full-size version of the payment rail. */
function Lifecycle({ invoice }: { invoice: Invoice }) {
  // Index of the current step; PAID marks every step done.
  const current = { DRAFT: 1, SENT: 2, VIEWED: 3, OVERDUE: 3, PARTIALLY_PAID: 3, PAID: 4, VOID: 1 }[invoice.status]
  const steps = [
    { label: 'Created', description: formatDate(invoice.issueDate, 'short') },
    { label: 'Sent', description: current > 1 ? formatDate(invoice.issueDate, 'short') : 'Not sent yet' },
    { label: 'Viewed', description: current > 2 ? 'Opened by client' : 'Waiting' },
    { label: invoice.status === 'PARTIALLY_PAID' ? 'Partly paid' : 'Paid', description: invoice.status === 'PAID' ? 'Settled' : `Due ${formatDate(invoice.dueDate, 'short')}` },
  ]
  return (
    <Card className="mb-6 flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
      <Stepper steps={steps} current={current} className="w-full" />
      {invoice.status === 'OVERDUE' && <p className="max-w-[260px] text-small font-semibold text-danger md:text-right">Overdue since {formatDate(invoice.dueDate)}. A reminder is scheduled.</p>}
      {invoice.status === 'VOID' && <p className="text-small font-semibold text-ink-600">Voided. This invoice can’t be paid.</p>}
    </Card>
  )
}
