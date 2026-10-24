import { useState } from 'react'
import { MdAdd, MdArrowForward, MdClose } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { RevenueChart } from '../components/charts/RevenueChart'
import { Button, IconButton } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { DeltaIndicator, PageContainer, PageHeader } from '../components/ui/Page'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/States'
import { Stepper } from '../components/ui/Stepper'
import { Tooltip } from '../components/ui/Tooltip'
import { cn } from '../lib/cn'
import { formatDate, formatHours, formatMoney } from '../lib/format'
import { useDashboard } from '../lib/queries'
import { currentUser } from '../mocks/data'
import type { DashboardSummary } from '../types'

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const summary = useDashboard()

  return (
    <PageContainer>
      <PageHeader
        eyebrow={<p className="text-small text-ink-500">{formatDate(new Date(), 'long')}</p>}
        title={`${greeting()}, ${currentUser.name.split(' ')[0]}`}
        actions={<Button leadingIcon={MdAdd} onClick={() => navigate('/clients?new=1')}>New client</Button>}
      />
      {summary.isPending ? <DashboardSkeleton /> : summary.isError ? (
        <Card><ErrorState onRetry={() => summary.refetch()} retrying={summary.isFetching} /></Card>
      ) : <DashboardContent data={summary.data} />}
    </PageContainer>
  )
}

function DashboardContent({ data }: { data: DashboardSummary }) {
  const current = data.aging.find((bucket) => !bucket.overdue)?.amount ?? 0
  const yearTotal = data.revenue.reduce((sum, point) => sum + point.collected, 0)
  const currentShare = data.outstanding ? (current / data.outstanding) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Ledger summary: what you're owed leads, everything else supports it. */}
      <section aria-label="Money summary" className="grid overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card lg:grid-cols-[1.5fr_1fr]">
        <div className="p-6 sm:p-8">
          <p className="text-overline uppercase text-ink-500">Owed to you</p>
          <p className="tnum mt-2 text-[44px] font-bold leading-[52px] tracking-[-0.03em] text-ink-900">{formatMoney(data.outstanding, 'KES', { whole: true })}</p>
          <p className="mt-2 text-body text-ink-600">
            <Link to="/invoices?status=OVERDUE" className="rounded-sm font-semibold text-danger underline-offset-4 hover:underline focus-ring">{formatMoney(data.overdue, 'KES', { compact: true })} is overdue</Link>
            {' '}across {data.overdueCount} invoices. The rest is within terms.
          </p>
          <div className="mt-6">
            <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${formatMoney(current, 'KES', { compact: true })} within terms, ${formatMoney(data.overdue, 'KES', { compact: true })} overdue`}>
              <Tooltip content={`Within terms: ${formatMoney(current)}`}><span className="h-full bg-brand-600" style={{ width: `${currentShare}%` }} /></Tooltip>
              <Tooltip content={`Overdue: ${formatMoney(data.overdue)}`}><span className="h-full flex-1 bg-danger" /></Tooltip>
            </div>
            <div className="mt-2.5 flex justify-between text-caption text-ink-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden />Within terms <span className="tnum font-semibold text-ink-800">{formatMoney(current, 'KES', { compact: true })}</span></span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" aria-hidden />Overdue <span className="tnum font-semibold text-ink-800">{formatMoney(data.overdue, 'KES', { compact: true })}</span></span>
            </div>
          </div>
        </div>
        <dl className="grid divide-y divide-ink-200 border-t border-ink-200 bg-ink-25 lg:border-l lg:border-t-0">
          <div className="px-6 py-5 sm:px-8">
            <dt className="text-overline uppercase text-ink-500">Collected this month</dt>
            <dd className="mt-1.5 text-[24px] font-bold tracking-[-0.02em] text-ink-900">{formatMoney(data.collectedThisMonth, 'KES', { compact: true })}</dd>
            <dd className="mt-1"><DeltaIndicator delta={{ value: data.collectedDelta, label: 'vs this point last month' }} /></dd>
          </div>
          <div className="px-6 py-5 sm:px-8">
            <dt className="text-overline uppercase text-ink-500">Logged this week</dt>
            <dd className="mt-1.5 text-[24px] font-bold tracking-[-0.02em] text-ink-900">{formatHours(data.hoursThisWeek)}</dd>
            <dd className="mt-1 text-caption text-ink-500">{data.billableShare}% billable · <Link to="/time" className="rounded-sm font-semibold text-brand-600 hover:text-brand-700 focus-ring">Open timesheet</Link></dd>
          </div>
        </dl>
      </section>

      <GettingStarted />

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader title="Revenue collected" description="Payments received each month" />
          <CardBody className="pt-1">
            <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="tnum text-[26px] font-bold tracking-[-0.02em] text-ink-900">{formatMoney(yearTotal, 'KES', { compact: true })}</p>
              <span className="text-small text-ink-500">in the last 12 months</span>
            </div>
            <RevenueChart data={data.revenue} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader title="Needs attention" />
          <ul className="mt-2 divide-y divide-ink-200 border-t border-ink-200">
            {data.attention.map((item) => (
              <li key={item.id}>
                <Link to={item.href} className="group flex items-start gap-3 px-5 py-4 transition-colors duration-fast hover:bg-ink-50 focus-ring sm:px-6">
                  <span className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full', item.kind === 'overdue' ? 'bg-danger' : 'bg-brand-600')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-semibold text-ink-900">{item.title}</span>
                    <span className="mt-0.5 flex justify-between gap-2 text-caption text-ink-500">
                      <span className="truncate">{item.detail}</span>
                      {item.amount !== undefined && <span className="tnum shrink-0 font-semibold text-ink-700">{formatMoney(item.amount, 'KES', { compact: true })}</span>}
                    </span>
                  </span>
                  <Icon icon={MdArrowForward} size="sm" className="mt-0.5 text-ink-300 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink-600" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}

const setupSteps = [
  { label: 'Business details', description: 'Name, KRA PIN, address' },
  { label: 'First client', description: 'Who you bill' },
  { label: 'Connect M‑Pesa', description: 'Get paid in one tap' },
  { label: 'Send an invoice', description: 'Your first payment' },
]

function GettingStarted() {
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-heading">Finish setting up</h2>
          <p className="mt-0.5 text-small text-ink-500">Two steps left before clients can pay you by M-Pesa.</p>
        </div>
        <IconButton icon={MdClose} label="Hide setup steps" size="sm" onClick={() => setHidden(true)} />
      </div>
      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <Stepper steps={setupSteps} current={2} className="w-full max-w-2xl" />
        <Button className="shrink-0" onClick={() => navigate('/settings')}>Connect M-Pesa</Button>
      </div>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-[220px] w-full rounded-lg" />
      <Skeleton className="h-[160px] w-full rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-12"><Skeleton className="h-[360px] rounded-lg lg:col-span-8" /><Skeleton className="h-[360px] rounded-lg lg:col-span-4" /></div>
    </LoadingRegion>
  )
}
