import { useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import { MdOutlineAccountBalance, MdOutlineLink, MdOutlinePayments, MdOutlinePhoneIphone, MdOutlineCreditCard, MdOutlineSavings } from 'react-icons/md'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { PageContainer, PageHeader, StatTile } from '../components/ui/Page'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { SegmentedControl } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/cn'
import { formatMoney } from '../lib/format'
import { daysUntil } from '../lib/invoice'
import { usePayments } from '../lib/queries'
import type { Payment, PaymentMethod } from '../types'

const methods: Record<PaymentMethod, { label: string; icon: IconType }> = {
  MPESA: { label: 'M-Pesa', icon: MdOutlinePhoneIphone },
  BANK_TRANSFER: { label: 'Bank transfer', icon: MdOutlineAccountBalance },
  CASH: { label: 'Cash', icon: MdOutlineSavings },
  CARD: { label: 'Card', icon: MdOutlineCreditCard },
}

type Filter = 'ALL' | Payment['status']

function groupLabel(iso: string) {
  const days = -daysUntil(iso)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'This week'
  if (days < 31) return 'This month'
  return 'Earlier'
}

export function PaymentsPage() {
  const payments = usePayments()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('ALL')
  const all = payments.data ?? []
  const kes = all.filter((p) => p.currency === 'KES')
  const received = kes.filter((p) => p.status === 'SUCCEEDED')
  const receivedTotal = received.reduce((sum, p) => sum + p.amount, 0)
  const mpesaTotal = received.filter((p) => p.method === 'MPESA').reduce((sum, p) => sum + p.amount, 0)

  const groups = useMemo(() => {
    const list = all.filter((p) => filter === 'ALL' || p.status === filter)
    const map = new Map<string, Payment[]>()
    list.forEach((payment) => { const key = groupLabel(payment.paidAt); map.set(key, [...(map.get(key) ?? []), payment]) })
    return [...map.entries()]
  }, [all, filter])

  const byMethod = (Object.keys(methods) as PaymentMethod[])
    .map((method) => ({ method, amount: received.filter((p) => p.method === method).reduce((sum, p) => sum + p.amount, 0) }))
    .filter((row) => row.amount > 0)
  const maxMethod = Math.max(...byMethod.map((row) => row.amount), 1)

  return (
    <PageContainer>
      <PageHeader title="Payments" description="Every shilling received, matched to the invoice it settles." />

      {payments.isPending ? (
        <LoadingRegion label="Loading payments" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[120px] rounded-lg" />)}</div>
          <Skeleton className="h-96 rounded-lg" />
        </LoadingRegion>
      ) : payments.isError ? <Card><ErrorState onRetry={() => payments.refetch()} /></Card> : all.length === 0 ? (
        <Card><EmptyState icon={MdOutlinePayments} title="No payments yet" description="When clients pay by M-Pesa, bank or card, payments appear here and settle their invoices automatically." /></Card>
      ) : (
        <>
          <section aria-label="Payment totals" className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatTile label="Received (KES)" value={formatMoney(receivedTotal, 'KES', { compact: true })} icon={MdOutlinePayments} footnote={`${received.length} payments`} />
            <StatTile label="Through M-Pesa" value={`${Math.round((mpesaTotal / Math.max(receivedTotal, 1)) * 100)}%`} icon={MdOutlinePhoneIphone} footnote={formatMoney(mpesaTotal, 'KES', { compact: true })} />
            <StatTile label="Needs attention" value={`${all.filter((p) => p.status !== 'SUCCEEDED').length}`} icon={MdOutlineLink} emphasis="danger" footnote="pending or failed" />
          </section>

          <div className="grid gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader
                title="Payment activity"
                actions={<SegmentedControl label="Filter payments" value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'All' }, { value: 'SUCCEEDED', label: 'Received' }, { value: 'PENDING', label: 'Pending' }, { value: 'FAILED', label: 'Failed' }]} />}
              />
              <div className="pb-2">
                {groups.length === 0 && <p className="px-6 py-10 text-center text-small text-ink-500">No payments with this status.</p>}
                {groups.map(([label, items]) => (
                  <section key={label} aria-label={label}>
                    <h3 className="sticky top-16 z-10 bg-white/95 px-5 pb-2 pt-4 text-overline uppercase text-ink-400 backdrop-blur sm:px-6">{label}</h3>
                    <ul>
                      {items.map((payment) => {
                        const method = methods[payment.method]
                        return (
                          <li key={payment.id}>
                            <Link to={`/invoices/${payment.invoiceId}`} className="flex items-center gap-4 px-5 py-3 transition-colors duration-fast hover:bg-ink-50 focus-ring sm:px-6">
                              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', payment.status === 'FAILED' ? 'bg-danger-soft text-danger' : payment.status === 'PENDING' ? 'bg-brand-50 text-brand-600' : 'bg-success-soft text-success')}>
                                <Icon icon={method.icon} size="md" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-ink-900">{payment.clientName}</span>
                                <span className="block truncate text-small text-ink-500">{method.label} · {payment.invoiceNumber} · {payment.reference}</span>
                              </span>
                              <span className="text-right">
                                <span className={cn('tnum block font-semibold', payment.status === 'FAILED' ? 'text-ink-400 line-through' : 'text-ink-900')}>{formatMoney(payment.amount, payment.currency)}</span>
                                <StatusBadge status={payment.status} />
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </Card>

            <div className="space-y-5 lg:col-span-4">
              <Card>
                <CardHeader title="By method" description="Received payments in KES" />
                <CardBody>
                  <ul className="space-y-4">
                    {byMethod.map(({ method, amount }) => (
                      <li key={method}>
                        <div className="mb-1.5 flex items-center justify-between text-small">
                          <span className="flex items-center gap-2 font-medium text-ink-700"><Icon icon={methods[method].icon} size="sm" className="text-ink-400" />{methods[method].label}</span>
                          <span className="tnum font-semibold text-ink-900">{formatMoney(amount, 'KES', { compact: true })}</span>
                        </div>
                        <div className="h-2 rounded-r-[4px] bg-brand-600" style={{ width: `${(amount / maxMethod) * 100}%` }} aria-hidden />
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon icon={MdOutlinePhoneIphone} size="md" /></span>
                  <div>
                    <p className="font-semibold text-ink-900">M-Pesa Paybill</p>
                    <p className="mt-0.5 text-small text-ink-500">Connect your own Daraja credentials so STK Push payments settle into your account.</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => toast({ tone: 'info', title: 'Gateway setup arrives with Step 10', description: 'Credentials will be stored encrypted per workspace.' })}>Connect M-Pesa</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  )
}
