import { useMemo, useState } from 'react'
import { MdAdd, MdOutlineFolderOpen } from 'react-icons/md'
import { Link } from 'react-router-dom'
import { AvatarGroup } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageContainer, PageHeader, SearchInput } from '../components/ui/Page'
import { ProgressBar } from '../components/ui/Progress'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState, NoResults } from '../components/ui/States'
import { SegmentedControl } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/cn'
import { formatDate } from '../lib/format'
import { dueLabel, daysUntil } from '../lib/invoice'
import { useProjects } from '../lib/queries'
import type { Project, ProjectStatus } from '../types'

type Filter = 'ALL' | ProjectStatus

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
        description="Progress and deadlines across everything in flight."
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
          {Array.from({ length: 6 }, (_, i) => <Card key={i} className="space-y-6 p-6"><div className="w-2/3 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-1/2" /></div><div className="space-y-2"><Skeleton className="h-6 w-14" /><Skeleton className="h-1.5 w-full" /></div><Skeleton className="h-3 w-1/3" /></Card>)}
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
  const days = daysUntil(project.dueDate)
  const dueSoon = project.status !== 'COMPLETED' && days >= 0 && days <= 7

  return (
    <Link to={`/projects/${project.id}`} className="group block h-full rounded-lg focus-ring">
      <Card className="flex h-full flex-col p-6 transition-[border-color,box-shadow] duration-base ease-out group-hover:border-ink-300 group-hover:shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-subheading text-ink-900 group-hover:text-brand-700">{project.name}</h2>
            <p className="truncate text-small text-ink-500">{project.clientName}</p>
          </div>
          {/* Only unusual states get a badge; "Active" is the default and says nothing. */}
          {project.status !== 'ACTIVE' && <StatusBadge status={project.status} />}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="tnum text-[22px] font-bold tracking-[-0.02em] text-ink-900">{project.progress}%</span>
            <span className="text-caption text-ink-500">{project.openTasks} tasks open</span>
          </div>
          <ProgressBar value={project.progress} label={`${project.name} is ${project.progress}% complete`} tone={project.status === 'AT_RISK' ? 'danger' : project.status === 'ON_HOLD' ? 'muted' : 'brand'} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <span className={cn('text-caption', project.status === 'AT_RISK' && dueSoon ? 'font-semibold text-danger' : dueSoon ? 'font-semibold text-ink-800' : 'text-ink-500')}>
            {project.status === 'COMPLETED' ? `Delivered ${formatDate(project.dueDate, 'short')}` : dueLabel(project.dueDate)}
          </span>
          <AvatarGroup names={project.team} />
        </div>
      </Card>
    </Link>
  )
}
