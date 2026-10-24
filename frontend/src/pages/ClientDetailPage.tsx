import { useState } from 'react'
import {
  MdAdd, MdArrowBack, MdMoreHoriz, MdOutlineArchive, MdOutlineEdit, MdOutlineEmail, MdOutlineFolderOpen, MdOutlineLock, MdOutlinePhone,
  MdOutlineReceiptLong, MdOutlineSend, MdStar,
} from 'react-icons/md'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { Menu, MenuItem } from '../components/ui/Menu'
import { PageContainer } from '../components/ui/Page'
import { ProgressBar } from '../components/ui/Progress'
import { LoadingRegion, Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/States'
import { Tab, TabList, TabPanel, Tabs } from '../components/ui/Tabs'
import { PaymentRail } from '../components/ui/Stepper'
import { useToast } from '../components/ui/Toast'
import { Tooltip } from '../components/ui/Tooltip'
import { ClientFormModal } from '../features/clients/ClientFormModal'
import { formatDate, formatMoney, formatRelative } from '../lib/format'
import { invoiceTotals } from '../lib/invoice'
import { useArchiveClients, useClient, useContacts, useInvoices, useProjects } from '../lib/queries'
import { currentUser } from '../mocks/data'
import type { Client, Invoice } from '../types'

export function ClientDetailPage() {
  const { clientId = '' } = useParams()
  const client = useClient(clientId)

  return (
    <PageContainer>
      <Link to="/clients" className="mb-5 inline-flex items-center gap-1.5 rounded-sm text-small font-semibold text-ink-500 transition-colors hover:text-ink-800 focus-ring">
        <Icon icon={MdArrowBack} size="sm" /> Clients
      </Link>
      {client.isPending ? <DetailSkeleton /> : client.isError ? (
        <Card>
          <ErrorState
            title="We couldn’t find this client"
            description="It may have been deleted, or the link is wrong. Check the address or go back to your client list."
          />
          <div className="-mt-6 pb-10 text-center"><Link to="/clients" className="inline-flex h-10 items-center rounded-md border border-ink-300 bg-white px-4 font-semibold text-ink-800 shadow-xs hover:bg-ink-50 focus-ring">Back to clients</Link></div>
        </Card>
      ) : <ClientDetail client={client.data} />}
    </PageContainer>
  )
}

function ClientDetail({ client }: { client: Client }) {
  const navigate = useNavigate()
  const toast = useToast()
  const archive = useArchiveClients()
  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const { data: invoices } = useInvoices()
  const { data: projects } = useProjects()
  const contacts = useContacts(client.id)
  const clientInvoices = invoices?.filter((invoice) => invoice.clientId === client.id) ?? []
  const clientProjects = projects?.filter((project) => project.clientId === client.id) ?? []

  return (
    <>
      <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size="lg" square />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-title">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="mt-0.5 text-body text-ink-500">{client.industry} · Client since {formatDate(client.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" leadingIcon={MdOutlineEdit} onClick={() => setEditOpen(true)}>Edit</Button>
          <Button leadingIcon={MdOutlineSend} onClick={() => setInviteOpen(true)}>Invite to portal</Button>
          <Menu trigger={<IconButton icon={MdMoreHoriz} label="More actions" variant="secondary" />}>
            <MenuItem icon={MdOutlineArchive} danger onSelect={() => setArchiveOpen(true)} disabled={client.status === 'ARCHIVED'}>Archive client</MenuItem>
          </Menu>
        </div>
      </header>

      <section aria-label="Client figures" className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 shadow-card lg:grid-cols-4">
        <Figure label="Outstanding" value={client.outstanding > 0 ? formatMoney(client.outstanding, client.defaultCurrency) : 'Nothing due'} strong={client.outstanding > 0} />
        <Figure label="Total billed" value={formatMoney(client.totalBilled, client.defaultCurrency, { compact: true })} />
        <Figure label="Active projects" value={client.activeProjects.toString()} />
        <Figure label="Pays in, on average" value="12 days" detail={`Terms: ${client.paymentTermsDays} days`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <Tabs defaultValue="overview">
            <TabList className="mb-5">
              <Tab value="overview">Overview</Tab>
              <Tab value="invoices" count={clientInvoices.length}>Invoices</Tab>
              <Tab value="projects" count={clientProjects.length}>Projects</Tab>
              <Tab value="contacts" count={contacts.data?.length}>Contacts</Tab>
            </TabList>

            <TabPanel value="overview" className="space-y-5">
              {client.notes && (
                <div className="rounded-lg border-l-[3px] border-brand-600 bg-white px-4 py-3 shadow-card">
                  <p className="text-overline uppercase text-ink-500">Internal note</p>
                  <p className="mt-1 text-body text-ink-800">{client.notes}</p>
                </div>
              )}
              <ClientTimeline invoices={invoices && clientInvoices} client={client} />
            </TabPanel>

            <TabPanel value="invoices">
              <Card>
                {clientInvoices.length === 0 ? (
                  <EmptyState compact icon={MdOutlineReceiptLong} title="No invoices yet" description="Invoices you send this client will appear here with their payment status." />
                ) : (
                  <ul className="divide-y divide-ink-200">
                    {clientInvoices.map((invoice) => (
                      <li key={invoice.id}>
                        <Link to={`/invoices/${invoice.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50 focus-ring">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-100 text-ink-600"><Icon icon={MdOutlineReceiptLong} size="sm" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink-900">{invoice.number}</span>
                            <span className="block truncate text-small text-ink-500">{invoice.projectName ?? 'General services'} · Issued {formatDate(invoice.issueDate)}</span>
                          </span>
                          <PaymentRail status={invoice.status} className="hidden w-40 sm:inline-flex" />
                          <span className="tnum w-32 text-right font-semibold text-ink-900">{formatMoney(invoiceTotals(invoice).total, invoice.currency)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabPanel>

            <TabPanel value="projects">
              {clientProjects.length === 0 ? (
                <Card><EmptyState compact icon={MdOutlineFolderOpen} title="No projects" description="Start a project to track tasks, milestones and time for this client." /></Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {clientProjects.map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`} className="group rounded-lg focus-ring">
                      <Card className="h-full p-5 transition-shadow duration-base group-hover:shadow-pop">
                        <div className="flex items-start justify-between gap-2"><p className="font-semibold text-ink-900">{project.name}</p><StatusBadge status={project.status} /></div>
                        <p className="mt-1 line-clamp-2 text-small text-ink-500">{project.description}</p>
                        <ProgressBar className="mt-4" value={project.progress} label={`${project.name} progress`} showValue />
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="contacts">
              <Card>
                <CardHeader title="Contacts" description="People you deal with at this client" actions={<Button variant="secondary" size="sm" leadingIcon={MdAdd} onClick={() => toast({ tone: 'info', title: 'Adding contacts comes with API integration', description: 'The form will save to POST /clients/{id}/contacts.' })}>Add contact</Button>} divider />
                {contacts.isPending ? <CardBody><Skeleton className="h-12 w-full" /></CardBody> : contacts.data?.length ? (
                  <ul className="divide-y divide-ink-200">
                    {contacts.data.map((contact) => (
                      <li key={contact.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                        <Avatar name={contact.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-semibold text-ink-900">{contact.name}{contact.primary && <Badge tone="brand" icon={MdStar}>Primary</Badge>}</p>
                          <p className="text-small text-ink-500">{contact.roleTitle}</p>
                        </div>
                        <div className="flex gap-1">
                          {contact.email && <ContactLink href={`mailto:${contact.email}`} icon={MdOutlineEmail} label={`Email ${contact.name}`} />}
                          {contact.phone && <ContactLink href={`tel:${contact.phone.replace(/\s/g, '')}`} icon={MdOutlinePhone} label={`Call ${contact.name}`} />}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <EmptyState compact icon={MdOutlineEmail} title="No contacts yet" description="Add the people who approve work and pay invoices." />}
              </Card>
            </TabPanel>
          </Tabs>
        </div>

        <aside className="min-w-0 space-y-5 lg:col-span-4">
          <Card>
            <CardHeader title="Billing details" divider />
            <CardBody>
              <dl className="space-y-3.5 text-body">
                <Detail label="Billing email" value={client.billingEmail} />
                <Detail label="Phone" value={client.phone} />
                <Detail label="KRA PIN" value={client.taxId} />
                <Detail label="Currency" value={client.defaultCurrency} />
                <Detail label="Payment terms" value={`${client.paymentTermsDays} days`} />
                <Detail label="Address" value={client.address ? `${client.address}, ${client.country}` : undefined} />
              </dl>
            </CardBody>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon icon={MdOutlineLock} size="md" /></span>
              <div>
                <p className="font-semibold text-ink-900">Client portal</p>
                <p className="mt-0.5 text-small text-ink-500">
                  {client.portalAccess ? 'Contacts can view projects, approve deliverables and pay invoices online.' : 'Not invited yet. Invite contacts so they can pay invoices online.'}
                </p>
                <div className="mt-2">{client.portalAccess ? <Badge tone="done">Access active</Badge> : <Badge>No access</Badge>}</div>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <ClientFormModal open={editOpen} onOpenChange={setEditOpen} client={client} />
      <InvitePortalModal open={inviteOpen} onOpenChange={setInviteOpen} client={client} />
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Archive ${client.name}?`}
        description="They’ll be hidden from your client list and can’t receive new invoices. Existing invoices, payments and projects are kept."
        confirmLabel="Archive client"
        loading={archive.isPending}
        onConfirm={async () => { await archive.mutateAsync([client.id]); toast({ title: `${client.name} archived` }); navigate('/clients') }}
      />
    </>
  )
}

function Figure({ label, value, detail, strong }: { label: string; value: string; detail?: string; strong?: boolean }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-small text-ink-500">{label}</p>
      <p className={strong ? 'mt-1 text-[20px] font-bold tracking-[-0.01em] text-ink-900' : 'mt-1 text-[20px] font-semibold tracking-[-0.01em] text-ink-800'}>{value}</p>
      {detail && <p className="text-caption text-ink-500">{detail}</p>}
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-3">
      <dt className="text-small text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words text-small font-medium text-ink-800">{value || <span className="text-ink-400">Not set</span>}</dd>
    </div>
  )
}

function ContactLink({ href, icon, label }: { href: string; icon: typeof MdOutlineEmail; label: string }) {
  return (
    <Tooltip content={label}>
      <a href={href} aria-label={label} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink-300 bg-white text-ink-700 shadow-xs transition-colors duration-fast hover:bg-ink-50 focus-ring">
        <Icon icon={icon} size="sm" />
      </a>
    </Tooltip>
  )
}

type TimelineEvent = { id: string; text: string; detail: string; at: string; tone: 'brand' | 'done' | 'danger' }

// Derived from the client's invoices until GET /clients/{id}/activity exists.
function ClientTimeline({ invoices, client }: { invoices: Invoice[] | undefined; client: Client }) {
  if (!invoices) return <Card className="p-6"><LoadingRegion label="Loading activity" className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></LoadingRegion></Card>
  const events: TimelineEvent[] = invoices.flatMap((invoice) => {
    const { total } = invoiceTotals(invoice)
    const list: TimelineEvent[] = [{ id: `${invoice.id}-issued`, text: `${invoice.number} issued`, detail: formatMoney(total, invoice.currency), at: invoice.issueDate, tone: 'brand' }]
    if (invoice.amountPaid > 0) list.push({ id: `${invoice.id}-paid`, text: `Payment received for ${invoice.number}`, detail: formatMoney(invoice.amountPaid, invoice.currency), at: new Date(new Date(invoice.issueDate).getTime() + 5 * 86_400_000).toISOString(), tone: 'done' })
    if (invoice.status === 'OVERDUE') list.push({ id: `${invoice.id}-overdue`, text: `${invoice.number} became overdue`, detail: 'Reminder scheduled', at: invoice.dueDate, tone: 'danger' })
    return list
  })
  events.push({ id: 'created', text: `${client.name} added as a client`, detail: `by ${currentUser.name}`, at: client.createdAt, tone: 'brand' })
  events.sort((a, b) => b.at.localeCompare(a.at))
  // Issued events are hollow, payments are solid blue, overdue is red.
  const dot = { brand: 'border-2 border-brand-600 bg-white', done: 'bg-brand-600', danger: 'bg-danger' }

  return (
    <Card>
      <CardHeader title="Activity" description="Invoices and payments for this client" />
      <CardBody>
        <ol className="relative space-y-5 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-ink-300">
          {events.slice(0, 8).map((event) => (
            <li key={event.id} className="relative flex gap-4 pl-0">
              <span className={`relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white ${dot[event.tone]}`} aria-hidden />
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4">
                <div>
                  <p className="text-small font-semibold text-ink-900">{event.text}</p>
                  <p className="text-caption text-ink-500">{formatRelative(event.at)}</p>
                </div>
                <p className="tnum text-small text-ink-600">{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  )
}

function InvitePortalModal({ open, onOpenChange, client }: { open: boolean; onOpenChange: (open: boolean) => void; client: Client }) {
  const toast = useToast()
  const [email, setEmail] = useState(client.email ?? '')
  const [error, setError] = useState<string>()
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address'); return }
    setSending(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setSending(false)
    onOpenChange(false)
    toast({ title: 'Invitation recorded', description: `${email} can join the portal for 7 days once email delivery is connected.` })
  }
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!sending}
      size="sm"
      title="Invite to client portal"
      description={`They’ll get a secure sign-in link to see ${client.name}’s projects and invoices. The link expires in 7 days.`}
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button><Button leadingIcon={MdOutlineSend} loading={sending} onClick={send}>Send invitation</Button></>}
    >
      <Field label="Email address" required error={error}>
        <Input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(undefined) }} placeholder="name@company.co.ke" autoFocus />
      </Field>
    </Modal>
  )
}

function DetailSkeleton() {
  return (
    <LoadingRegion label="Loading client" className="space-y-6">
      <div className="flex items-center gap-4"><Skeleton className="h-14 w-14 rounded-md" /><div className="space-y-2"><Skeleton className="h-6 w-56" /><Skeleton className="h-3 w-40" /></div></div>
      <Skeleton className="h-[88px] w-full rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-12"><Skeleton className="h-72 rounded-lg lg:col-span-8" /><Skeleton className="h-72 rounded-lg lg:col-span-4" /></div>
    </LoadingRegion>
  )
}
