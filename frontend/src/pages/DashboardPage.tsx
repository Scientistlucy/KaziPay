import type { IconType } from 'react-icons'
import {
  MdAdd, MdArrowForward, MdOutlineAccountBalanceWallet, MdOutlineCheckCircle, MdOutlineFolderOpen, MdOutlinePayments, MdOutlinePeopleAlt,
  MdOutlineReceiptLong, MdOutlineSchedule, MdOutlineTaskAlt, MdOutlineTimer, MdOutlineWarningAmber, MdTrendingUp,
} from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { AgingBars } from '../components/charts/AgingBars'
import { RevenueChart } from '../components/charts/RevenueChart'
import { AvatarGroup } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { DeltaIndicator, PageContainer, PageHeader, StatTile } from '../components/ui/Page'
import { ProgressBar } from '../components/ui/Progress'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/States'
import { cn } from '../lib/cn'
import { formatDate, formatHours, formatMoney, formatRelative } from '../lib/format'
import { useActivity, useDashboard, useProjects } from '../lib/queries'
import { currentUser } from '../mocks/data'
import type { Activity, DashboardSummary } from '../types'

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

const activityIcons: Record<Activity['kind'], IconType> = {
  payment: MdOutlinePayments, invoice: MdOutlineReceiptLong, client: MdOutlinePeopleAlt, project: MdOutlineFolderOpen, time: MdOutlineTimer, task: MdOutlineTaskAlt,
}

const attentionStyles = {
  overdue: { icon: MdOutlineWarningAmber, tile: 'bg-danger-soft text-danger', label: 'Overdue' },
  approval: { icon: MdOutlineCheckCircle, tile: 'bg-brand-50 text-brand-600', label: 'Approval' },
  due: { icon: MdOutlineSchedule, tile: 'bg-warning-soft text-warning', label: 'Due soon' },
}

export function DashboardPage() {
  const navigate = useNavigate()
  const summary = useDashboard()
  const firstName = currentUser.name.split(' ')[0]

  return (
    <PageContainer>
      <PageHeader
        eyebrow={<p className="text-small font-medium text-ink-500">{formatDate(new Date(), 'long')}</p>}
        title={`${greeting()}, ${firstName}`}
        description="Here’s where your money and work stand today."
        actions={
          <>
            <Button variant="secondary" leadingIcon={MdOutlineTimer} onClick={() => navigate('/time')}>Log time</Button>
            <Button leadingIcon={MdAdd} onClick={() => navigate('/clients?new=1')}>New client</Button>
          </>
        }
      />

      {summary.isPending ? <DashboardSkeleton /> : summary.isError ? (
        <Card><ErrorState onRetry={() => summary.refetch()} retrying={summary.isFetching} /></Card>
      ) : (
        <DashboardContent data={summary.data} />
      )}
    </PageContainer>
  )
}

function DashboardContent({ data }: { data: DashboardSummary }) {
  const yearTotal = data.revenue.reduce((sum, point) => sum + point.collected, 0)
  return (
    <div className="space-y-5">
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Outstanding" value={formatMoney(data.outstanding, 'KES', { compact: true })} icon={MdOutlineAccountBalanceWallet} delta={{ value: data.outstandingDelta, label: 'vs last month', positiveIsGood: false }} />
        <StatTile label="Overdue" value={formatMoney(data.overdue, 'KES', { compact: true })} icon={MdOutlineWarningAmber} emphasis="danger" footnote={`${data.overdueCount} invoices past due`} />
        <StatTile label="Collected this month" value={formatMoney(data.collectedThisMonth, 'KES', { compact: true })} icon={MdTrendingUp} delta={{ value: data.collectedDelta, label: 'vs same point last month' }} />
        <StatTile label="Hours this week" value={formatHours(data.hoursThisWeek)} icon={MdOutlineTimer} footnote={`${data.billableShare}% billable`} />
      </section>

      <section className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader
            title="Revenue collected"
            description="Payments received per month, last 12 months"
            actions={<span className="rounded-md border border-ink-200 bg-ink-25 px-2.5 py-1 text-caption font-semibold text-ink-600">12 months</span>}
          />
          <CardBody className="pt-2">
            <div className="mb-2 flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="text-display text-ink-900">{formatMoney(yearTotal, 'KES', { compact: true })}</p>
              <div className="pb-1.5"><DeltaIndicator delta={{ value: 18.2, label: 'vs previous 12 months' }} /></div>
            </div>
            <RevenueChart data={data.revenue} />
          </CardBody>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardHeader title="Receivables by age" description="Unpaid invoice balances" />
          <CardBody className="flex flex-1 flex-col pt-4">
            <AgingBars data={data.aging} />
            <div className="mt-auto pt-6">
              <div className="flex items-center justify-between rounded-md border border-danger-line bg-danger-soft px-3.5 py-2.5">
                <span className="flex items-center gap-2 text-small font-semibold text-danger"><Icon icon={MdOutlineWarningAmber} size="sm" />{formatMoney(data.overdue, 'KES', { compact: true })} overdue</span>
                <Link to="/invoices?status=OVERDUE" className="text-small font-semibold text-danger underline-offset-4 hover:underline focus-ring rounded-sm">Chase</Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Needs your attention" description="Sorted by what costs you money first" />
          <ul className="divide-y divide-ink-200 px-2 pb-2 pt-2 sm:px-3">
            {data.attention.map((item) => {
              const style = attentionStyles[item.kind]
              return (
                <li key={item.id}>
                  <Link to={item.href} className="group flex items-center gap-4 rounded-md px-3 py-3.5 transition-colors duration-fast hover:bg-ink-50 focus-ring">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', style.tile)}><Icon icon={style.icon} size="md" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink-900">{item.title}</span>
                      <span className="block truncate text-small text-ink-500">{style.label} · {item.detail}</span>
                    </span>
                    {item.amount !== undefined && <span className="tnum hidden text-body font-semibold text-ink-900 sm:block">{formatMoney(item.amount)}</span>}
                    <Icon icon={MdArrowForward} size="sm" className="text-ink-300 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink-500" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
        <RecentActivity />
      </section>

      <ActiveProjects />
    </div>
  )
}

function RecentActivity() {
  const activity = useActivity()
  return (
    <Card className="lg:col-span-5">
      <CardHeader title="Recent activity" />
      <CardBody>
        {activity.isPending ? (
          <LoadingRegion label="Loading activity" className="space-y-5">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-4/5" /><Skeleton className="h-2.5 w-1/3" /></div></div>)}
          </LoadingRegion>
        ) : activity.isError ? <ErrorState onRetry={() => activity.refetch()} /> : (
          <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-ink-300">
            {activity.data.slice(0, 5).map((event) => (
              <li key={event.id} className="relative flex gap-3">
                <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white', event.kind === 'payment' ? 'bg-success-soft text-success' : 'bg-ink-100 text-ink-600')}>
                  <Icon icon={activityIcons[event.kind]} size="sm" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-small text-ink-700">
                    <span className="font-semibold text-ink-900">{event.actor}</span> {event.text} <span className="font-semibold text-ink-900">{event.target}</span>
                    {event.amount !== undefined && <span className="tnum font-semibold text-success"> {formatMoney(event.amount)}</span>}
                  </p>
                  <p className="mt-0.5 text-caption text-ink-500">{formatRelative(event.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  )
}

function ActiveProjects() {
  const projects = useProjects()
  const active = projects.data?.filter((p) => p.status === 'ACTIVE' || p.status === 'AT_RISK').slice(0, 3)
  return (
    <section aria-labelledby="active-projects">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="active-projects" className="text-heading">Active projects</h2>
        <Link to="/projects" className="inline-flex items-center gap-1 text-small font-semibold text-brand-600 hover:text-brand-700 focus-ring rounded-sm">View all <Icon icon={MdArrowForward} size="xs" /></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {projects.isPending
          ? Array.from({ length: 3 }, (_, i) => <Card key={i} className="space-y-4 p-5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-1.5 w-full" /></Card>)
          : active?.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="group rounded-lg focus-ring">
              <Card className="h-full p-5 transition-[border-color,box-shadow] duration-base group-hover:border-ink-300 group-hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-subheading text-ink-900">{project.name}</p>
                    <p className="truncate text-small text-ink-500">{project.clientName}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <ProgressBar className="mt-5" value={project.progress} label={`${project.name} progress`} showValue tone={project.status === 'AT_RISK' ? 'danger' : 'brand'} />
                <div className="mt-4 flex items-center justify-between text-caption text-ink-500">
                  <span>Due {formatDate(project.dueDate, 'short')}</span>
                  <AvatarGroup names={project.team} />
                </div>
              </Card>
            </Link>
          ))}
      </div>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading dashboard" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Card key={i} className="space-y-4 p-5"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-7 w-2/3" /><Skeleton className="h-3 w-1/3" /></Card>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="space-y-4 p-6 lg:col-span-8"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-8 w-1/4" /><Skeleton className="h-[240px] w-full" /></Card>
        <Card className="space-y-6 p-6 lg:col-span-4"><Skeleton className="h-4 w-1/2" />{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-3 w-full" />)}</Card>
      </div>
    </LoadingRegion>
  )
}
