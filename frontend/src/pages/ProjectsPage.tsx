import { useMemo, useState } from 'react'
import { MdAdd, MdOutlineCalendarToday, MdOutlineFolderOpen, MdOutlineTaskAlt, MdOutlineTimer } from 'react-icons/md'
import { Link } from 'react-router-dom'
import { AvatarGroup } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { PageContainer, PageHeader, SearchInput } from '../components/ui/Page'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState, NoResults } from '../components/ui/States'
import { SegmentedControl } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/cn'
import { formatMoney } from '../lib/format'
import { dueLabel, daysUntil } from '../lib/invoice'
import { useProjects } from '../lib/queries'
import type { Project, ProjectStatus } from '../types'

type Filter = 'ALL' | ProjectStatus

const billingLabels: Record<Project['billingType'], string> = {
  FIXED_PRICE: 'Fixed price', TIME_AND_MATERIALS: 'Time and materials', RETAINER: 'Retainer', MILESTONE: 'Milestones',
}

export function ProjectsPage() {
  const projects = useProjects()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')
  const all = projects.data ?? []
  const count = (status: Filter) => (status === 'ALL' ? all.length : all.filter((p) => p.status === status).length)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((p) => (filter === 'ALL' || p.status === filter) && (!q || `${p.name} ${p.clientName}`.toLowerCase().includes(q)))
  }, [all, filter, query])

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Progress, budget and deadlines across everything in flight."
        actions={<Button leadingIcon={MdAdd} onClick={() => toast({ tone: 'info', title: 'Project creation arrives with Step 7', description: 'The backend for projects, members and milestones is next on the build order.' })}>New project</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          label="Filter projects by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'All', count: count('ALL') },
            { value: 'ACTIVE', label: 'Active', count: count('ACTIVE') },
            { value: 'AT_RISK', label: 'At risk', count: count('AT_RISK') },
            { value: 'ON_HOLD', label: 'On hold', count: count('ON_HOLD') },
            { value: 'COMPLETED', label: 'Completed', count: count('COMPLETED') },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects or clients" label="Search projects" />
      </div>

      {projects.isPending ? (
        <LoadingRegion label="Loading projects" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Card key={i} className="space-y-5 p-5"><div className="flex justify-between"><div className="w-2/3 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-11 w-11 rounded-full" /></div><Skeleton className="h-1.5 w-full" /><Skeleton className="h-3 w-1/3" /></Card>)}
        </LoadingRegion>
      ) : projects.isError ? <Card><ErrorState onRetry={() => projects.refetch()} /></Card> : all.length === 0 ? (
        <Card><EmptyState icon={MdOutlineFolderOpen} title="No projects yet" description="Projects hold your tasks, milestones and time for a client. Create one to get started." /></Card>
      ) : shown.length === 0 ? (
        <Card><NoResults query={query} onClear={() => { setQuery(''); setFilter('ALL') }} /></Card>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((project) => <li key={project.id}><ProjectCard project={project} /></li>)}
        </ul>
      )}
    </PageContainer>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const budgetUsed = Math.round((project.spent / project.budget) * 100)
  // A delivered project near its budget is expected, not an alarm.
  const budgetTone = project.status === 'COMPLETED' ? 'success' : budgetUsed >= 90 ? 'danger' : budgetUsed >= 75 ? 'warning' : 'brand'
  const days = daysUntil(project.dueDate)
  const dueSoon = project.status !== 'COMPLETED' && days >= 0 && days <= 7

  return (
    <Link to={`/projects/${project.id}`} className="group block h-full rounded-lg focus-ring">
      <Card className="flex h-full flex-col p-5 transition-[border-color,box-shadow,transform] duration-base ease-out group-hover:-translate-y-0.5 group-hover:border-ink-300 group-hover:shadow-pop">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="text-caption font-medium text-ink-500">{billingLabels[project.billingType]}</span>
            </div>
            <h2 className="truncate text-subheading text-ink-900 group-hover:text-brand-700">{project.name}</h2>
            <p className="truncate text-small text-ink-500">{project.clientName}</p>
          </div>
          <ProgressRing value={project.progress} label={`${project.name} is ${project.progress}% complete`} />
        </div>

        <div className="mb-5 mt-5">
          <div className="mb-1.5 flex items-baseline justify-between text-caption">
            <span className="font-medium text-ink-600">Budget used</span>
            <span className="tnum text-ink-500"><span className="font-semibold text-ink-800">{formatMoney(project.spent, 'KES', { compact: true })}</span> of {formatMoney(project.budget, 'KES', { compact: true })}</span>
          </div>
          <ProgressBar value={budgetUsed} label={`${budgetUsed}% of budget used`} tone={budgetTone} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-200 pt-4">
          <div className="flex items-center gap-3.5 text-caption text-ink-500">
            <span className={cn('inline-flex items-center gap-1', dueSoon && 'font-semibold text-warning')}>
              <Icon icon={MdOutlineCalendarToday} size="xs" />
              {project.status === 'COMPLETED' ? 'Delivered' : dueLabel(project.dueDate).replace('Due in', 'In')}
            </span>
            <span className="inline-flex items-center gap-1"><Icon icon={MdOutlineTaskAlt} size="xs" />{project.openTasks} open</span>
            <span className="hidden items-center gap-1 sm:inline-flex"><Icon icon={MdOutlineTimer} size="xs" />{project.hoursLogged}h</span>
          </div>
          <AvatarGroup names={project.team} size="xs" />
        </div>
      </Card>
    </Link>
  )
}
