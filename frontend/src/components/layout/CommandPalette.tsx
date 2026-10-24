import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import type { IconType } from 'react-icons'
import {
  MdAdd, MdOutlineFolderOpen, MdOutlinePayments, MdOutlinePeopleAlt, MdOutlineReceiptLong, MdOutlineSettings, MdOutlineSpaceDashboard, MdOutlineTimer, MdSearch,
} from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import { useClients, useInvoices, useProjects } from '../../lib/queries'
import { Icon } from '../ui/Icon'
import { Kbd } from '../ui/Page'

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

function Item({ icon, label, hint, onSelect, value }: { icon: IconType; label: string; hint?: string; onSelect: () => void; value?: string }) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className="flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-body text-ink-700 data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-800"
    >
      <Icon icon={icon} size="sm" className="text-ink-400" />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-caption text-ink-400">{hint}</span>}
    </Command.Item>
  )
}

const groupClass = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-ink-400'

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const { data: clients } = useClients()
  const { data: projects } = useProjects()
  const { data: invoices } = useInvoices()
  const go = (to: string) => { onOpenChange(false); navigate(to) }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink-900/45 backdrop-blur-[2px] animate-overlay-in" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-xl bg-white shadow-modal outline-none animate-content-in">
          <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
          <Dialog.Description className="sr-only">Search clients, projects and invoices, or run a command.</Dialog.Description>
          <Command loop label="Search and commands">
            <div className="flex items-center gap-3 border-b border-ink-200 px-4">
              <Icon icon={MdSearch} size="md" className="text-ink-400" />
              <Command.Input autoFocus placeholder="Search clients, projects, invoices or type a command" className="h-14 flex-1 bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-400" />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="scrollbar-thin max-h-[min(420px,60vh)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-10 text-center text-small text-ink-500">No matches. Try a client name or an invoice number.</Command.Empty>
              <Command.Group heading="Create" className={groupClass}>
                <Item icon={MdAdd} label="New client" onSelect={() => go('/clients?new=1')} />
                <Item icon={MdOutlineTimer} label="Log time" onSelect={() => go('/time')} />
              </Command.Group>
              <Command.Group heading="Navigate" className={groupClass}>
                <Item icon={MdOutlineSpaceDashboard} label="Dashboard" hint="G D" onSelect={() => go('/')} />
                <Item icon={MdOutlinePeopleAlt} label="Clients" hint="G C" onSelect={() => go('/clients')} />
                <Item icon={MdOutlineFolderOpen} label="Projects" hint="G P" onSelect={() => go('/projects')} />
                <Item icon={MdOutlineTimer} label="Time" onSelect={() => go('/time')} />
                <Item icon={MdOutlineReceiptLong} label="Invoices" hint="G I" onSelect={() => go('/invoices')} />
                <Item icon={MdOutlinePayments} label="Payments" onSelect={() => go('/payments')} />
                <Item icon={MdOutlineSettings} label="Settings" onSelect={() => go('/settings')} />
              </Command.Group>
              {clients && (
                <Command.Group heading="Clients" className={groupClass}>
                  {clients.filter((c) => c.status === 'ACTIVE').map((client) => (
                    <Item key={client.id} value={`client ${client.name}`} icon={MdOutlinePeopleAlt} label={client.name} hint={client.industry} onSelect={() => go(`/clients/${client.id}`)} />
                  ))}
                </Command.Group>
              )}
              {projects && (
                <Command.Group heading="Projects" className={groupClass}>
                  {projects.map((project) => (
                    <Item key={project.id} value={`project ${project.name} ${project.clientName}`} icon={MdOutlineFolderOpen} label={project.name} hint={project.clientName} onSelect={() => go(`/projects/${project.id}`)} />
                  ))}
                </Command.Group>
              )}
              {invoices && (
                <Command.Group heading="Invoices" className={groupClass}>
                  {invoices.map((invoice) => (
                    <Item key={invoice.id} value={`invoice ${invoice.number} ${invoice.clientName}`} icon={MdOutlineReceiptLong} label={invoice.number} hint={invoice.clientName} onSelect={() => go(`/invoices/${invoice.id}`)} />
                  ))}
                </Command.Group>
              )}
            </Command.List>
            <div className="flex items-center gap-4 border-t border-ink-200 bg-ink-25 px-4 py-2.5 text-caption text-ink-500">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
              <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> to open</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
