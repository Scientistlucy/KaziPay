import { MdAdd, MdArrowBack, MdCheck, MdOutlineEdit, MdOutlineFlag } from 'react-icons/md'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { Figure, Figures, PageContainer } from '../components/ui/Page'
import { ProgressBar } from '../components/ui/Progress'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/States'
import { Tab, TabList, TabPanel, Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { TaskBoard } from '../features/projects/TaskBoard'
import { cn } from '../lib/cn'
import { formatDate, formatMoney } from '../lib/format'
import { dueLabel } from '../lib/invoice'
import { useMilestones, useProject, useTeam } from '../lib/queries'
import type { Milestone, Project } from '../types'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const project = useProject(projectId)
  return (
    <PageContainer>
      <Link to="/projects" className="mb-5 inline-flex items-center gap-1.5 rounded-sm text-small font-semibold text-ink-500 hover:text-ink-800 focus-ring">
        <Icon icon={MdArrowBack} size="sm" /> Projects
      </Link>
      {project.isPending ? (
        <LoadingRegion label="Loading project" className="space-y-6"><Skeleton className="h-16 w-2/3" /><Skeleton className="h-24 w-full rounded-lg" /><Skeleton className="h-96 w-full rounded-lg" /></LoadingRegion>
      ) : project.isError ? (
        <Card><ErrorState title="We couldn’t find this project" description="It may have been deleted, or the link is wrong." /></Card>
      ) : <ProjectDetail project={project.data} />}
    </PageContainer>
  )
}

function ProjectDetail({ project }: { project: Project }) {
  const toast = useToast()
  const milestones = useMilestones(project.id)
  const budgetUsed = Math.round((project.spent / project.budget) * 100)

  return (
    <>
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-title">{project.name}</h1>
            {project.status !== 'ACTIVE' && <StatusBadge status={project.status} />}
          </div>
          <p className="mt-1 text-body text-ink-500">
            <Link to={`/clients/${project.clientId}`} className="rounded-sm font-semibold text-brand-600 hover:text-brand-700 focus-ring">{project.clientName}</Link>
            {' · '}{project.description}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" leadingIcon={MdOutlineEdit} onClick={() => toast({ tone: 'info', title: 'Project editing arrives with Step 7' })}>Edit</Button>
          <Button leadingIcon={MdAdd} onClick={() => toast({ tone: 'info', title: 'Task creation arrives with Step 8' })}>Add task</Button>
        </div>
      </header>

      <Figures className="mb-8">
        <Figure label="Progress" value={`${project.progress}%`} detail={`${project.openTasks} tasks open`} />
        <Figure label="Budget used" value={`${budgetUsed}%`} detail={`${formatMoney(project.spent, 'KES', { compact: true })} of ${formatMoney(project.budget, 'KES', { compact: true })}`} alarm={budgetUsed >= 90 && project.status !== 'COMPLETED'} />
        <Figure label="Time logged" value={`${project.hoursLogged}h`} detail={`Since ${formatDate(project.startDate, 'short')}`} />
        <Figure label="Deadline" value={formatDate(project.dueDate, 'short')} detail={project.status === 'COMPLETED' ? 'Delivered' : dueLabel(project.dueDate)} alarm={project.status === 'AT_RISK'} />
      </Figures>

      <Tabs defaultValue="board">
        <TabList className="mb-5">
          <Tab value="board">Board</Tab>
          <Tab value="milestones" count={milestones.data?.length}>Milestones</Tab>
          <Tab value="team" count={project.team.length}>Team</Tab>
        </TabList>
        <TabPanel value="board"><TaskBoard projectId={project.id} /></TabPanel>
        <TabPanel value="milestones">
          {milestones.isPending ? <Skeleton className="h-64 w-full rounded-lg" /> : <MilestoneTimeline milestones={milestones.data ?? []} />}
        </TabPanel>
        <TabPanel value="team"><ProjectTeam names={project.team} /></TabPanel>
      </Tabs>
    </>
  )
}

function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const total = milestones.reduce((sum, m) => sum + m.amount, 0)
  const invoiced = milestones.filter((m) => m.status === 'COMPLETED').reduce((sum, m) => sum + m.amount, 0)
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader title="Milestones" description="Completing a milestone drafts its invoice" />
        <CardBody>
          <ol className="relative">
            {milestones.map((milestone, index) => {
              const done = milestone.status === 'COMPLETED'
              const current = milestone.status === 'IN_PROGRESS'
              return (
                <li key={milestone.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {index < milestones.length - 1 && <span className={cn('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', done ? 'bg-brand-600' : 'bg-ink-200')} aria-hidden />}
                  <span className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    done ? 'border-brand-600 bg-brand-600 text-white' : current ? 'border-brand-600 bg-white text-brand-600' : 'border-ink-300 bg-white text-ink-400',
                  )}>
                    {done ? <Icon icon={MdCheck} size="sm" /> : <Icon icon={MdOutlineFlag} size="sm" />}
                  </span>
                  <div className={cn('min-w-0 flex-1 rounded-lg', current && '-mt-1 border border-brand-200 bg-brand-50/50 p-3.5')}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-semibold text-ink-900">{milestone.title}</p>
                      <p className="tnum text-small font-semibold text-ink-800">{formatMoney(milestone.amount)}</p>
                    </div>
                    <p className="mt-0.5 text-small text-ink-500">{milestone.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-caption">
                      <StatusBadge status={milestone.status} />
                      <span className="text-ink-500">{done ? `Completed ${formatDate(milestone.dueDate)}` : `Due ${formatDate(milestone.dueDate)}`}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </CardBody>
      </Card>
      <Card className="h-fit p-5 lg:col-span-4">
        <p className="text-small text-ink-500">Milestone value</p>
        <p className="tnum mt-1 text-[22px] font-bold tracking-[-0.02em] text-ink-900">{formatMoney(total, 'KES', { compact: true })}</p>
        <ProgressBar className="mt-4" value={invoiced} max={total} label="Share of milestone value invoiced" />
        <dl className="mt-4 space-y-2 text-small">
          <div className="flex justify-between"><dt className="text-ink-500">Invoiced</dt><dd className="tnum font-semibold text-ink-800">{formatMoney(invoiced)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-500">Remaining</dt><dd className="tnum font-semibold text-ink-800">{formatMoney(total - invoiced)}</dd></div>
        </dl>
      </Card>
    </div>
  )
}

function ProjectTeam({ names }: { names: string[] }) {
  const { data: team } = useTeam()
  const members = names.map((name) => team?.find((member) => member.name === name) ?? { name, role: 'MEMBER', rate: 0, email: '' })
  return (
    <Card>
      <ul className="divide-y divide-ink-200">
        {members.map((member) => (
          <li key={member.name} className="flex items-center gap-4 px-5 py-4 sm:px-6">
            <Avatar name={member.name} size="md" />
            <div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{member.name}</p><p className="truncate text-small text-ink-500">{member.email}</p></div>
            <span className="hidden text-small capitalize text-ink-600 sm:block">{member.role.toLowerCase()}</span>
            <span className="tnum w-36 text-right text-small text-ink-700">{member.rate ? `${formatMoney(member.rate)}/h` : '—'}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
