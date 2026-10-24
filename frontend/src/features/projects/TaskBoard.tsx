import { useState, type DragEvent } from 'react'
import type { IconType } from 'react-icons'
import {
  MdAdd, MdChatBubbleOutline, MdChecklist, MdDragIndicator, MdKeyboardArrowDown, MdKeyboardDoubleArrowUp, MdKeyboardArrowUp, MdMoreHoriz, MdOutlineCalendarToday,
  MdOutlineVisibility, MdRemove,
} from 'react-icons/md'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Menu, MenuItem, MenuLabel } from '../../components/ui/Menu'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { Tooltip } from '../../components/ui/Tooltip'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { daysUntil } from '../../lib/invoice'
import { useMoveTask, useTasks } from '../../lib/queries'
import type { Priority, Task, TaskStatus } from '../../types'

// Column dots darken as work moves right: one blue ramp, read as progress.
const columns: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'TODO', label: 'To do', accent: 'bg-ink-300' },
  { status: 'IN_PROGRESS', label: 'In progress', accent: 'bg-brand-300' },
  { status: 'REVIEW', label: 'In review', accent: 'bg-brand-500' },
  { status: 'DONE', label: 'Done', accent: 'bg-brand-700' },
]

// Priority is an arrow and a word; only Urgent earns the alarm color.
const priorities: Record<Priority, { label: string; icon: IconType; className: string }> = {
  URGENT: { label: 'Urgent', icon: MdKeyboardDoubleArrowUp, className: 'text-danger' },
  HIGH: { label: 'High', icon: MdKeyboardArrowUp, className: 'text-ink-800' },
  MEDIUM: { label: 'Medium', icon: MdRemove, className: 'text-ink-500' },
  LOW: { label: 'Low', icon: MdKeyboardArrowDown, className: 'text-ink-400' },
}

export function TaskBoard({ projectId }: { projectId: string }) {
  const tasks = useTasks(projectId)
  const move = useMoveTask(projectId)
  const toast = useToast()
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<TaskStatus | null>(null)

  const moveTo = (task: Task, status: TaskStatus) => {
    if (task.status === status) return
    const label = columns.find((c) => c.status === status)!.label
    move.mutate({ id: task.id, status }, {
      onSuccess: () => toast({ title: `Moved to ${label}`, description: task.title }),
      onError: () => toast({ tone: 'danger', title: 'Couldn’t move the task', description: 'It’s back where it was. Try again.' }),
    })
  }

  const onDrop = (event: DragEvent, status: TaskStatus) => {
    event.preventDefault()
    const task = tasks.data?.find((t) => t.id === event.dataTransfer.getData('text/plain'))
    setOver(null)
    setDragging(null)
    if (task) moveTo(task, status)
  }

  if (tasks.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading tasks">
        {columns.map((c) => <div key={c.status} className="space-y-3 rounded-lg bg-ink-100/60 p-3"><Skeleton className="h-4 w-1/3" />{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg bg-white" />)}</div>)}
      </div>
    )
  }

  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[1000px] grid-cols-4 gap-4 xl:min-w-0">
        {columns.map((column) => {
          const items = tasks.data?.filter((task) => task.status === column.status) ?? []
          const isOver = over === column.status
          return (
            <section
              key={column.status}
              aria-label={`${column.label}, ${items.length} tasks`}
              onDragOver={(event) => { event.preventDefault(); setOver(column.status) }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(null) }}
              onDrop={(event) => onDrop(event, column.status)}
              className={cn(
                'flex min-h-[420px] flex-col rounded-lg border p-2.5 transition-colors duration-base',
                isOver ? 'border-dashed border-brand-400 bg-brand-50/70' : 'border-transparent bg-ink-100/60',
              )}
            >
              <header className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
                <h3 className="flex items-center gap-2 text-small font-semibold text-ink-800">
                  <span className={cn('h-2 w-2 rounded-full', column.accent)} aria-hidden />
                  {column.label}
                  <span className="tnum rounded-full bg-white px-1.5 text-caption font-semibold text-ink-500 shadow-xs">{items.length}</span>
                </h3>
                <IconButton icon={MdAdd} label={`Add task to ${column.label}`} size="sm" onClick={() => toast({ tone: 'info', title: 'Task creation arrives with Step 8' })} />
              </header>
              <ul className="flex flex-1 flex-col gap-2.5">
                {items.map((task) => (
                  <li key={task.id}>
                    <TaskCard task={task} dragging={dragging === task.id} onDragStart={() => setDragging(task.id)} onDragEnd={() => { setDragging(null); setOver(null) }} onMove={(status) => moveTo(task, status)} />
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-ink-300 px-4 py-8 text-center text-small text-ink-500">
                    {isOver ? 'Drop to move here' : 'No tasks. Drag a card here.'}
                  </li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

type TaskCardProps = { task: Task; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onMove: (status: TaskStatus) => void }

function TaskCard({ task, dragging, onDragStart, onDragEnd, onMove }: TaskCardProps) {
  const priority = priorities[task.priority]
  const days = task.dueDate ? daysUntil(task.dueDate) : null
  const late = days !== null && days < 0 && task.status !== 'DONE'
  const soon = days !== null && days >= 0 && days <= 2 && task.status !== 'DONE'

  return (
    <article
      draggable
      onDragStart={(event) => { event.dataTransfer.setData('text/plain', task.id); event.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnd={onDragEnd}
      className={cn(
        'group cursor-grab rounded-lg border border-ink-200 bg-white p-3.5 shadow-xs transition-[box-shadow,transform,opacity] duration-base ease-out active:cursor-grabbing',
        'hover:border-ink-300 hover:shadow-card',
        dragging && 'rotate-[1.5deg] scale-[1.02] opacity-60 shadow-pop',
        task.status === 'DONE' && 'bg-ink-25',
      )}
    >
      <div className="relative flex items-start gap-2">
        <Icon icon={MdDragIndicator} size="sm" className="absolute -left-3.5 top-0.5 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />
        <p className={cn('flex-1 text-small font-semibold leading-5 text-ink-900', task.status === 'DONE' && 'text-ink-500 line-through decoration-ink-300')}>{task.title}</p>
        <Menu trigger={<IconButton icon={MdMoreHoriz} label={`Move ${task.title}`} size="sm" tooltip={false} className="-mr-1.5 -mt-1 h-7 w-7" />} width="w-48">
          <MenuLabel>Move to</MenuLabel>
          {columns.filter((c) => c.status !== task.status).map((c) => (
            <MenuItem key={c.status} onSelect={() => onMove(c.status)}><span className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', c.accent)} />{c.label}</span></MenuItem>
          ))}
        </Menu>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption">
          {task.status !== 'DONE' && (
            <span className={cn('inline-flex items-center gap-0.5 font-semibold', priority.className)}><Icon icon={priority.icon} size="xs" />{priority.label}</span>
          )}
          {task.dueDate && task.status !== 'DONE' && (
            <span className={cn('inline-flex items-center gap-1', late ? 'font-semibold text-danger' : soon ? 'font-semibold text-ink-800' : 'text-ink-500')}>
              <Icon icon={MdOutlineCalendarToday} size="xs" />{late ? 'Late · ' : ''}{formatDate(task.dueDate, 'short')}
            </span>
          )}
          {task.comments > 0 && <span className="inline-flex items-center gap-1 text-ink-500" aria-label={`${task.comments} comments`}><Icon icon={MdChatBubbleOutline} size="xs" />{task.comments}</span>}
          {task.checklist && <span className={cn('tnum inline-flex items-center gap-1', task.checklist.done === task.checklist.total ? 'text-brand-700' : 'text-ink-500')} aria-label={`Checklist ${task.checklist.done} of ${task.checklist.total}`}><Icon icon={MdChecklist} size="xs" />{task.checklist.done}/{task.checklist.total}</span>}
          {task.clientVisible && <Tooltip content="Visible to the client"><span className="inline-flex text-ink-500" aria-label="Visible to the client"><Icon icon={MdOutlineVisibility} size="xs" /></span></Tooltip>}
        </div>
        <Avatar name={task.assignee} size="xs" />
      </div>
    </article>
  )
}
