import { useMemo, useState } from 'react'
import {
  MdAdd, MdMoreHoriz, MdOutlineArchive, MdOutlineEdit, MdOutlineFileDownload, MdOutlineFileUpload, MdOutlinePeopleAlt, MdOutlineUnarchive, MdOutlineVisibility,
} from 'react-icons/md'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { ConfirmDialog } from '../components/ui/Modal'
import { Menu, MenuItem, MenuSeparator } from '../components/ui/Menu'
import { PageContainer, PageHeader, SearchInput } from '../components/ui/Page'
import { EmptyState, ErrorState, NoResults } from '../components/ui/States'
import { SegmentedControl } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { ClientFormModal } from '../features/clients/ClientFormModal'
import { ImportClientsModal } from '../features/clients/ImportClientsModal'
import { cn } from '../lib/cn'
import { downloadCsv } from '../lib/download'
import { formatMoney, formatRelative } from '../lib/format'
import { useArchiveClients, useClients, useRestoreClient } from '../lib/queries'
import type { Client } from '../types'

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED'

export function ClientsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const clients = useClients()
  const archive = useArchiveClients()
  const restore = useRestoreClient()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ACTIVE')
  const [editing, setEditing] = useState<Client | undefined>()
  const [formOpen, setFormOpen] = useState(params.get('new') === '1')
  const [importOpen, setImportOpen] = useState(false)
  const [toArchive, setToArchive] = useState<{ ids: string[]; label: string; clear?: () => void } | null>(null)

  const all = clients.data ?? []
  const counts = { ALL: all.length, ACTIVE: all.filter((c) => c.status === 'ACTIVE').length, ARCHIVED: all.filter((c) => c.status === 'ARCHIVED').length }
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((client) => (status === 'ALL' || client.status === status)
      && (!q || [client.name, client.email, client.industry, client.phone].some((value) => value?.toLowerCase().includes(q))))
  }, [all, query, status])

  const openNew = () => { setEditing(undefined); setFormOpen(true) }
  const closeForm = (open: boolean) => {
    setFormOpen(open)
    if (!open && params.has('new')) { params.delete('new'); setParams(params, { replace: true }) }
  }

  const confirmArchive = async () => {
    if (!toArchive) return
    await archive.mutateAsync(toArchive.ids)
    toArchive.clear?.()
    toast({ title: toArchive.ids.length === 1 ? `${toArchive.label} archived` : `${toArchive.ids.length} clients archived`, description: 'Their invoices and projects are kept.', action: toArchive.ids.length === 1 ? { label: 'Undo', onClick: () => restore.mutate(toArchive.ids[0]!) } : undefined })
    setToArchive(null)
  }

  const exportClients = (rows: Client[]) => {
    downloadCsv('clients.csv', ['name', 'company', 'email', 'phone', 'billingEmail', 'address', 'country', 'taxId', 'defaultCurrency', 'notes'],
      rows.map((c) => [c.name, c.company, c.email, c.phone, c.billingEmail, c.address, c.country, c.taxId, c.defaultCurrency, c.notes]))
    toast({ title: `Exported ${rows.length} ${rows.length === 1 ? 'client' : 'clients'}`, description: 'Saved as clients.csv. You can import it back at any time.' })
  }

  const totals = useMemo(() => {
    const active = all.filter((c) => c.status === 'ACTIVE')
    return { outstanding: active.reduce((sum, c) => sum + c.outstanding, 0), owing: active.filter((c) => c.outstanding > 0).length }
  }, [all])

  const columns: Column<Client>[] = [
    {
      id: 'name', header: 'Client', sortValue: (c) => c.name.toLowerCase(),
      cell: (c) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <Avatar name={c.name} size="sm" square />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-ink-900"><span className="truncate">{c.name}</span>{c.status === 'ARCHIVED' && <StatusBadge status="ARCHIVED" />}</p>
            <p className="truncate text-small text-ink-500">{c.industry}</p>
          </div>
        </div>
      ),
    },
    { id: 'contact', header: 'Contact', hideable: true, cell: (c) => <div className="max-w-[200px]"><p className="truncate text-small text-ink-700">{c.email}</p><p className="tnum truncate text-small text-ink-500">{c.phone}</p></div> },
    {
      id: 'outstanding', header: 'Outstanding', align: 'right', sortValue: (c) => c.outstanding,
      cell: (c) => <span className={cn('font-semibold', c.outstanding > 0 ? 'text-ink-900' : 'text-ink-400')}>{c.outstanding > 0 ? formatMoney(c.outstanding, c.defaultCurrency) : '—'}</span>,
    },
    { id: 'billed', header: 'Total billed', align: 'right', hideable: true, defaultHidden: true, sortValue: (c) => c.totalBilled, cell: (c) => <span className="text-ink-700">{formatMoney(c.totalBilled, c.defaultCurrency, { compact: true })}</span> },
    { id: 'projects', header: 'Projects', align: 'right', hideable: true, defaultHidden: true, sortValue: (c) => c.activeProjects, cell: (c) => <span className="text-ink-700">{c.activeProjects}</span> },
    { id: 'activity', header: 'Last activity', hideable: true, sortValue: (c) => c.lastActivityAt, cell: (c) => <span className="whitespace-nowrap text-small text-ink-500">{formatRelative(c.lastActivityAt)}</span> },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description={clients.data
          ? <><span className="tnum font-semibold text-ink-800">{counts.ACTIVE}</span> active clients owe you <span className="tnum font-semibold text-ink-800">{formatMoney(totals.outstanding, 'KES', { compact: true })}</span></>
          : 'Everyone you work for and what they owe.'}
        actions={
          <>
            <Menu trigger={<Button variant="secondary" leadingIcon={MdOutlineFileUpload}>Import or export</Button>}>
              <MenuItem icon={MdOutlineFileUpload} onSelect={() => setImportOpen(true)}>Import from CSV</MenuItem>
              <MenuItem icon={MdOutlineFileDownload} onSelect={() => exportClients(all)}>Export all to CSV</MenuItem>
            </Menu>
            <Button leadingIcon={MdAdd} onClick={openNew}>New client</Button>
          </>
        }
      />

      {clients.isError ? (
        <div className="rounded-lg border border-ink-200 bg-white shadow-card"><ErrorState onRetry={() => clients.refetch()} retrying={clients.isFetching} /></div>
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          loading={clients.isPending}
          getRowId={(c) => c.id}
          rowLabel={(c) => c.name}
          itemLabel="clients"
          initialSort={{ id: 'activity', direction: 'desc' }}
          onRowClick={(c) => navigate(`/clients/${c.id}`)}
          toolbar={
            <>
              <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or industry" label="Search clients" />
              <SegmentedControl
                label="Filter by status"
                value={status}
                onChange={setStatus}
                options={[{ value: 'ACTIVE', label: 'Active', count: counts.ACTIVE }, { value: 'ARCHIVED', label: 'Archived', count: counts.ARCHIVED }, { value: 'ALL', label: 'All', count: counts.ALL }]}
              />
            </>
          }
          bulkActions={(selected, clear) => (
            <>
              <Button variant="secondary" size="sm" leadingIcon={MdOutlineFileDownload} onClick={() => exportClients(all.filter((c) => selected.includes(c.id)))}>Export</Button>
              <Button variant="secondary" size="sm" leadingIcon={MdOutlineArchive} onClick={() => setToArchive({ ids: selected, label: `${selected.length} clients`, clear })}>Archive</Button>
            </>
          )}
          rowActions={(c) => (
            <Menu trigger={<IconButton icon={MdMoreHoriz} label={`Actions for ${c.name}`} size="sm" tooltip={false} />}>
              <MenuItem icon={MdOutlineVisibility} onSelect={() => navigate(`/clients/${c.id}`)}>View client</MenuItem>
              <MenuItem icon={MdOutlineEdit} onSelect={() => { setEditing(c); setFormOpen(true) }}>Edit details</MenuItem>
              <MenuSeparator />
              {c.status === 'ACTIVE'
                ? <MenuItem icon={MdOutlineArchive} danger onSelect={() => setToArchive({ ids: [c.id], label: c.name })}>Archive client</MenuItem>
                : <MenuItem icon={MdOutlineUnarchive} onSelect={() => restore.mutate(c.id, { onSuccess: () => toast({ title: `${c.name} restored` }) })}>Restore client</MenuItem>}
            </Menu>
          )}
          mobileCard={(c) => (
            <div className="flex items-start gap-3">
              <Avatar name={c.name} size="md" square />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-ink-900">{c.name}</p>
                  {c.status === 'ARCHIVED' && <StatusBadge status={c.status} />}
                </div>
                <p className="truncate text-small text-ink-500">{c.industry} · {formatRelative(c.lastActivityAt)}</p>
                <p className="tnum mt-1.5 text-small font-semibold text-ink-900">{c.outstanding > 0 ? `${formatMoney(c.outstanding, c.defaultCurrency)} outstanding` : 'Nothing outstanding'}</p>
              </div>
            </div>
          )}
          empty={
            all.length === 0 ? (
              <EmptyState
                icon={MdOutlinePeopleAlt}
                title="No clients yet"
                description="Add your first client to start tracking projects, time and invoices for them."
                action={<><Button leadingIcon={MdAdd} onClick={openNew}>New client</Button><Button variant="secondary" leadingIcon={MdOutlineFileUpload} onClick={() => setImportOpen(true)}>Import CSV</Button></>}
              />
            ) : <NoResults query={query} onClear={() => { setQuery(''); setStatus('ALL') }} />
          }
        />
      )}

      <ClientFormModal open={formOpen} onOpenChange={closeForm} client={editing} onSaved={(c) => !editing && navigate(`/clients/${c.id}`)} />
      <ImportClientsModal open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={toArchive !== null}
        onOpenChange={(open) => !open && setToArchive(null)}
        title={toArchive?.ids.length === 1 ? `Archive ${toArchive.label}?` : `Archive ${toArchive?.ids.length} clients?`}
        description="Archived clients are hidden from lists and can’t receive new invoices. Existing invoices, payments and projects are kept, and you can restore them at any time."
        confirmLabel={toArchive?.ids.length === 1 ? 'Archive client' : 'Archive clients'}
        loading={archive.isPending}
        onConfirm={confirmArchive}
      />
    </PageContainer>
  )
}
