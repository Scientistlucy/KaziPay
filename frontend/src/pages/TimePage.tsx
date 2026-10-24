import { useEffect, useMemo, useState } from 'react'
import { MdAdd, MdChevronLeft, MdChevronRight, MdInfoOutline, MdOutlineSend, MdPause, MdPlayArrow } from 'react-icons/md'
import { HoursChart } from '../components/charts/HoursChart'
import { formatClock, useTimer } from '../components/layout/timer'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/Modal'
import { PageContainer, PageHeader } from '../components/ui/Page'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/cn'
import { formatHours } from '../lib/format'
import { useProjects, useTimesheet } from '../lib/queries'
import type { TimesheetRow } from '../types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function weekStart(offset: number) {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + offset * 7)
  return monday
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export function TimePage() {
  const toast = useToast()
  const sheet = useTimesheet()
  const [week, setWeek] = useState(0)
  const [rows, setRows] = useState<TimesheetRow[]>([])
  const [saved, setSaved] = useState<TimesheetRow[]>([])
  const [saving, setSaving] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { if (sheet.data) { setRows(sheet.data); setSaved(sheet.data) } }, [sheet.data])

  const start = weekStart(week)
  const dates = DAYS.map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const rangeLabel = `${dates[0]!.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} – ${dates[6]!.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const visibleRows = week === 0 ? rows : rows.map((row) => ({ ...row, hours: row.hours.map(() => 0) }))
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved)
  const dayTotals = DAYS.map((_, day) => sum(visibleRows.map((row) => row.hours[day] ?? 0)))
  const total = sum(dayTotals)
  const billable = sum(visibleRows.filter((r) => r.billable).flatMap((r) => r.hours))
  const todayIndex = week === 0 ? (new Date().getDay() + 6) % 7 : -1
  const chartData = useMemo(() => DAYS.map((day, i) => ({
    day,
    billable: sum(visibleRows.filter((r) => r.billable).map((r) => r.hours[i] ?? 0)),
    nonBillable: sum(visibleRows.filter((r) => !r.billable).map((r) => r.hours[i] ?? 0)),
  })), [visibleRows])

  const setCell = (rowIndex: number, day: number, value: string) => {
    const hours = Math.max(0, Math.min(24, Number(value.replace(',', '.')) || 0))
    setRows((current) => current.map((row, i) => (i === rowIndex ? { ...row, hours: row.hours.map((h, d) => (d === day ? hours : h)) } : row)))
  }

  const save = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setSaved(rows)
    setSaving(false)
    toast({ title: 'Timesheet saved', description: `${formatHours(total)} logged for ${rangeLabel}.` })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Time"
        description="Log hours against projects. Approved time flows straight into invoices."
        actions={
          <Button leadingIcon={MdOutlineSend} disabled={submitted || dirty || week !== 0 || total === 0} onClick={() => setSubmitOpen(true)}>
            {submitted ? 'Submitted for approval' : 'Submit week'}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <IconButton icon={MdChevronLeft} label="Previous week" variant="secondary" size="sm" onClick={() => setWeek((w) => w - 1)} />
                <IconButton icon={MdChevronRight} label="Next week" variant="secondary" size="sm" onClick={() => setWeek((w) => w + 1)} disabled={week >= 0} />
                <div className="ml-2">
                  <p className="text-subheading text-ink-900">{week === 0 ? 'This week' : week === -1 ? 'Last week' : `${Math.abs(week)} weeks ago`}</p>
                  <p className="text-caption text-ink-500">{rangeLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {submitted && week === 0 ? <Badge tone="partial">Awaiting approval</Badge> : <Badge>Draft</Badge>}
                <p className="tnum text-small text-ink-600"><span className="text-heading text-ink-900">{formatHours(total)}</span> total</p>
              </div>
            </div>

            {sheet.isPending ? (
              <LoadingRegion label="Loading timesheet" className="space-y-3 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</LoadingRegion>
            ) : sheet.isError ? <ErrorState onRetry={() => sheet.refetch()} /> : (
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-ink-200 bg-ink-25">
                      <th scope="col" className="h-12 min-w-[230px] pl-5 text-left text-overline uppercase text-ink-500 sm:pl-6">Project</th>
                      {DAYS.map((day, i) => (
                        <th key={day} scope="col" className={cn('w-[60px] text-center text-overline uppercase', i === todayIndex ? 'text-brand-700' : 'text-ink-500')}>
                          <span className="block">{day}</span>
                          <span className={cn('tnum mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-caption normal-case tracking-normal', i === todayIndex ? 'bg-brand-600 text-white' : 'text-ink-400')}>{dates[i]!.getDate()}</span>
                        </th>
                      ))}
                      <th scope="col" className="w-24 whitespace-nowrap pr-5 text-right text-overline uppercase text-ink-500 sm:pr-6">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, rowIndex) => (
                      <tr key={row.projectId} className="border-b border-ink-200">
                        <th scope="row" className="py-3 pl-5 text-left font-normal sm:pl-6">
                          <p className="flex items-center gap-2 text-small font-semibold text-ink-900">
                            <span className={cn('h-2 w-2 shrink-0 rounded-sm', row.billable ? 'bg-chart-1' : 'bg-chart-2')} aria-hidden />
                            {row.projectName}
                          </p>
                          <p className="pl-4 text-caption text-ink-500">{row.clientName}{row.billable ? '' : ' · Non-billable'}</p>
                        </th>
                        {row.hours.map((hours, day) => (
                          <td key={day} className={cn('px-1 text-center', day === todayIndex && 'bg-brand-50/50', day >= 5 && day !== todayIndex && 'bg-ink-25')}>
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`${row.projectName}, ${DAYS[day]} hours`}
                              value={hours === 0 ? '' : hours}
                              placeholder="–"
                              disabled={submitted || week !== 0}
                              onChange={(event) => setCell(rowIndex, day, event.target.value)}
                              className="tnum h-9 w-14 rounded-md border border-transparent bg-transparent text-center text-small font-semibold text-ink-900 outline-none transition-[border-color,box-shadow,background-color] duration-fast placeholder:text-ink-300 hover:border-ink-300 hover:bg-white focus:border-brand-600 focus:bg-white focus:shadow-focus disabled:hover:border-transparent disabled:hover:bg-transparent"
                            />
                          </td>
                        ))}
                        <td className="tnum whitespace-nowrap pr-5 text-right text-small font-semibold text-ink-900 sm:pr-6">{formatHours(sum(row.hours))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-ink-25">
                      <td className="h-12 pl-5 sm:pl-6">
                        <Button variant="tertiary" size="sm" leadingIcon={MdAdd} disabled={submitted || week !== 0} onClick={() => toast({ tone: 'info', title: 'Adding rows arrives with Step 8', description: 'Pick any project you’re a member of.' })}>Add project</Button>
                      </td>
                      {dayTotals.map((value, day) => <td key={day} className={cn('tnum whitespace-nowrap text-center text-small font-semibold', value > 8 ? 'text-ink-900 underline decoration-brand-400 decoration-2 underline-offset-4' : 'text-ink-700')} title={value > 8 ? 'More than 8 hours' : undefined}>{value ? formatHours(value) : '–'}</td>)}
                      <td className="tnum whitespace-nowrap pr-5 text-right text-body font-bold text-ink-900 sm:pr-6">{formatHours(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {dirty && (
            <div role="status" className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 shadow-pop animate-toast-in">
              <p className="flex items-center gap-2 text-small font-semibold text-ink-800"><span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden />You have unsaved changes</p>
              <div className="flex gap-2">
                <Button variant="tertiary" size="sm" onClick={() => setRows(saved)} disabled={saving}>Discard</Button>
                <Button size="sm" onClick={save} loading={saving}>Save timesheet</Button>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5 xl:col-span-4">
          <TimerCard />
          <Card>
            <CardHeader title="This week" description={`${total ? Math.round((billable / total) * 100) : 0}% billable · target 32h`} />
            <CardBody><HoursChart data={chartData} /></CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        tone="primary"
        title={`Submit ${formatHours(total)} for approval?`}
        description="Your manager will review this week. Once it’s approved, these entries are locked and can be invoiced."
        confirmLabel="Submit week"
        onConfirm={() => { setSubmitOpen(false); setSubmitted(true); toast({ title: 'Week submitted', description: 'Brian Mwangi will be notified to approve it.' }) }}
      />
    </PageContainer>
  )
}

function TimerCard() {
  const { running, elapsed, start, stop } = useTimer()
  const { data: projects } = useProjects()
  const toast = useToast()
  const [projectId, setProjectId] = useState('pr_1')
  const [description, setDescription] = useState('')
  const active = projects?.filter((p) => p.status !== 'COMPLETED') ?? []

  return (
    <Card className={cn('overflow-hidden', running && 'border-brand-200')}>
      <div className="px-5 pb-5 pt-5 sm:px-6">
        <div className="flex items-center justify-between">
          <p className="text-subheading text-ink-900">Timer</p>
          {running && <Badge tone="brand">Running</Badge>}
        </div>
        <p className={cn('tnum mt-3 text-[40px] font-bold leading-none tracking-[-0.02em]', running ? 'text-brand-800' : 'text-ink-300')} aria-live="off">{formatClock(elapsed)}</p>
        <p className="mt-2 truncate text-small text-ink-500">{running ? `${running.projectName} · ${running.description}` : 'Pick a project and start tracking.'}</p>
      </div>
      <div className="space-y-4 border-t border-ink-200 px-5 py-5 sm:px-6">
        {!running && (
          <>
            <Field label="Project">
              <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="What are you working on?" optional>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Dispatch board filters" />
            </Field>
          </>
        )}
        {running ? (
          <Button fullWidth size="lg" variant="secondary" leadingIcon={MdPause} onClick={() => { const entry = stop(); if (entry) toast({ title: `Logged ${formatClock(entry.seconds)}`, description: `Added to ${entry.projectName} for today.` }) }}>
            Stop and save
          </Button>
        ) : (
          <Button fullWidth size="lg" leadingIcon={MdPlayArrow} onClick={() => start({ projectId, projectName: active.find((p) => p.id === projectId)?.name ?? 'Project', description: description || 'General work' })}>
            Start timer
          </Button>
        )}
        <p className="flex items-center gap-1.5 text-caption text-ink-500"><Icon icon={MdInfoOutline} size="xs" />Only one timer can run at a time.</p>
      </div>
    </Card>
  )
}
