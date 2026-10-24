import { useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import {
  MdAdd, MdMoreHoriz, MdOutlineBlock, MdOutlineDrafts, MdOutlineFileDownload, MdOutlineReceiptLong, MdOutlineSend, MdOutlineTaskAlt, MdOutlineVisibility, MdOutlineWarningAmber,
} from 'react-icons/md'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StatusBadge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/Modal'
import { Menu, MenuItem, MenuSeparator } from '../components/ui/Menu'
import { PageContainer, PageHeader, SearchInput } from '../components/ui/Page'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState, ErrorState, NoResults } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/cn'
import { formatDate, formatMoney } from '../lib/format'
import { daysUntil, dueLabel, invoiceTotals } from '../lib/invoice'
import { useInvoiceAction, useInvoices } from '../lib/queries'
import type { Invoice, InvoiceStatus } from '../types'

type Filter = 'ALL' | 'OUTSTANDING' | 'OVERDUE' | 'DRAFT' | 'PAID'
const outstandingStatuses: InvoiceStatus[] = ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE']

export function InvoicesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const invoices = useInvoices()
  const send = useInvoiceAction('send')
  const voidInvoice = useInvoiceAction('void')
  const [query, setQuery] = useState('')
  const [toVoid, setToVoid] = useState<Invoice | null>(null)
  const filter = (params.get('status') as Filter | null) ?? 'ALL'
  const setFilter = (next: Filter) => { if (next === 'ALL') params.delete('status'); else params.set('status', next); setParams(params, { replace: true }) }

  const all = invoices.data ?? []
  const matches = (invoice: Invoice, f: Filter) =>
    f === 'ALL' || (f === 'OUTSTANDING' ? outstandingStatuses.includes(invoice.status) : invoice.status === f)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((invoice) => matches(invoice, filter) && (!q || `${invoice.number} ${invoice.clientName} ${invoice.projectName ?? ''}`.toLowerCase().includes(q)))
  }, [all, filter, query])

  const totalOf = (list: Invoice[], field: 'total' | 'balance') => list.reduce((sum, i) => sum + (i.currency === 'KES' ? invoiceTotals(i)[field] : 0), 0)
  const outstanding = all.filter((i) => outstandingStatuses.includes(i.status))
  const overdue = all.filter((i) => i.status === 'OVERDUE')
  const drafts = all.filter((i) => i.status === 'DRAFT')
  const paid = all.filter((i) => i.status === 'PAID')

  const columns: Column<Invoice>[] = [
    {
      id: 'number', header: 'Invoice', sortValue: (i) => i.number,
      cell: (i) => (
        <div className="min-w-[170px]">
          <p className="font-semibold text-ink-900">{i.number}</p>
          <p className="max-w-[220px] truncate text-small text-ink-500">{i.projectName ?? 'General services'}</p>
        </div>
      ),
    },
    { id: 'client', header: 'Client', sortValue: (i) => i.clientName, cell: (i) => <span className="text-ink-800">{i.clientName}</span> },
    { id: 'issued', header: 'Issued', hideable: true, sortValue: (i) => i.issueDate, cell: (i) => <span className="whitespace-nowrap text-small text-ink-600">{formatDate(i.issueDate)}</span> },
    {
      id: 'due', header: 'Due', sortValue: (i) => i.dueDate,
      cell: (i) => {
        const open = outstandingStatuses.includes(i.status)
        const days = daysUntil(i.dueDate)
        return (
          <div className="whitespace-nowrap">
            <p className="text-small text-ink-700">{formatDate(i.dueDate)}</p>
            {open && <p className={cn('text-caption', days < 0 ? 'font-semibold text-danger' : days <= 3 ? 'font-semibold text-warning' : 'text-ink-500')}>{dueLabel(i.dueDate)}</p>}
          </div>
        )
      },
    },
    { id: 'total', header: 'Amount', align: 'right', sortValue: (i) => invoiceTotals(i).total, cell: (i) => <span className="font-semibold text-ink-900">{formatMoney(invoiceTotals(i).total, i.currency)}</span> },
    {
      id: 'balance', header: 'Balance', align: 'right', hideable: true, sortValue: (i) => invoiceTotals(i).balance,
      cell: (i) => { const { balance } = invoiceTotals(i); return <span className={balance > 0 && i.status !== 'DRAFT' && i.status !== 'VOID' ? 'text-ink-800' : 'text-ink-400'}>{balance > 0 && i.status !== 'VOID' ? formatMoney(balance, i.currency) : '—'}</span> },
    },
    { id: 'status', header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Invoices"
        description="Track what you’ve billed, what’s been paid, and what needs a nudge."
        actions={<Button leadingIcon={MdAdd} onClick={() => toast({ tone: 'info', title: 'The invoice editor arrives with Step 9', description: 'It will generate invoices from approved time and expenses.' })}>New invoice</Button>}
      />

      <section aria-label="Filter by invoice status" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {invoices.isPending ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px] rounded-lg" />) : (
          <>
            <FilterCard icon={MdOutlineReceiptLong} label="Outstanding" value={formatMoney(totalOf(outstanding, 'balance'), 'KES', { compact: true })} detail={`${outstanding.length} invoices`} active={filter === 'OUTSTANDING'} onClick={() => setFilter(filter === 'OUTSTANDING' ? 'ALL' : 'OUTSTANDING')} />
            <FilterCard icon={MdOutlineWarningAmber} label="Overdue" value={formatMoney(totalOf(overdue, 'balance'), 'KES', { compact: true })} detail={`${overdue.length} invoices`} tone="danger" active={filter === 'OVERDUE'} onClick={() => setFilter(filter === 'OVERDUE' ? 'ALL' : 'OVERDUE')} />
            <FilterCard icon={MdOutlineDrafts} label="Drafts" value={drafts.length.toString()} detail="not sent yet" active={filter === 'DRAFT'} onClick={() => setFilter(filter === 'DRAFT' ? 'ALL' : 'DRAFT')} />
            <FilterCard icon={MdOutlineTaskAlt} label="Paid" value={formatMoney(totalOf(paid, 'total'), 'KES', { compact: true })} detail={`${paid.length} invoices`} tone="success" active={filter === 'PAID'} onClick={() => setFilter(filter === 'PAID' ? 'ALL' : 'PAID')} />
          </>
        )}
      </section>

      {invoices.isError ? <div className="rounded-lg border border-ink-200 bg-white"><ErrorState onRetry={() => invoices.refetch()} /></div> : (
        <DataTable
          rows={filtered}
          columns={columns}
          loading={invoices.isPending}
          getRowId={(i) => i.id}
          rowLabel={(i) => i.number}
          itemLabel="invoices"
          initialSort={{ id: 'number', direction: 'desc' }}
          onRowClick={(i) => navigate(`/invoices/${i.id}`)}
          toolbar={
            <>
              <SearchInput value={query} onChange={setQuery} placeholder="Search number, client or project" label="Search invoices" />
              {filter !== 'ALL' && (
                <button type="button" onClick={() => setFilter('ALL')} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 pl-3 pr-2 text-small font-semibold text-brand-700 hover:bg-brand-100 focus-ring">
                  {filter === 'OUTSTANDING' ? 'Outstanding' : filter === 'OVERDUE' ? 'Overdue' : filter === 'DRAFT' ? 'Drafts' : 'Paid'}
                  <span aria-hidden className="text-brand-500">×</span><span className="sr-only">Remove filter</span>
                </button>
              )}
            </>
          }
          rowActions={(i) => (
            <Menu trigger={<IconButton icon={MdMoreHoriz} label={`Actions for ${i.number}`} size="sm" tooltip={false} />}>
              <MenuItem icon={MdOutlineVisibility} onSelect={() => navigate(`/invoices/${i.id}`)}>View invoice</MenuItem>
              {i.status === 'DRAFT' && <MenuItem icon={MdOutlineSend} onSelect={() => send.mutate(i.id, { onSuccess: () => toast({ title: `${i.number} sent`, description: `Emailed to ${i.clientName} with a pay link.` }) })}>Send to client</MenuItem>}
              <MenuItem icon={MdOutlineFileDownload} onSelect={() => toast({ tone: 'info', title: 'PDF download arrives with Step 9' })}>Download PDF</MenuItem>
              {i.status !== 'VOID' && i.status !== 'PAID' && (<><MenuSeparator /><MenuItem icon={MdOutlineBlock} danger onSelect={() => setToVoid(i)}>Void invoice</MenuItem></>)}
            </Menu>
          )}
          mobileCard={(i) => (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-semibold text-ink-900">{i.number}</p><p className="truncate text-small text-ink-500">{i.clientName}</p></div>
                <StatusBadge status={i.status} />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-caption text-ink-500">{outstandingStatuses.includes(i.status) ? dueLabel(i.dueDate) : `Issued ${formatDate(i.issueDate)}`}</span>
                <span className="tnum font-semibold text-ink-900">{formatMoney(invoiceTotals(i).total, i.currency)}</span>
              </div>
            </div>
          )}
          empty={all.length === 0
            ? <EmptyState icon={MdOutlineReceiptLong} title="No invoices yet" description="Turn approved time into your first invoice and get paid by M-Pesa." />
            : <NoResults query={query} onClear={() => { setQuery(''); setFilter('ALL') }} />}
        />
      )}

      <ConfirmDialog
        open={toVoid !== null}
        onOpenChange={(open) => !open && setToVoid(null)}
        title={`Void ${toVoid?.number}?`}
        description="The invoice stays on record but can no longer be paid. This can’t be undone. To correct a sent invoice, issue a credit note instead."
        confirmLabel="Void invoice"
        loading={voidInvoice.isPending}
        onConfirm={() => toVoid && voidInvoice.mutate(toVoid.id, { onSuccess: () => { toast({ title: `${toVoid.number} voided` }); setToVoid(null) } })}
      />
    </PageContainer>
  )
}

type FilterCardProps = { icon: IconType; label: string; value: string; detail: string; active: boolean; onClick: () => void; tone?: 'brand' | 'danger' | 'success' }

function FilterCard({ icon, label, value, detail, active, onClick, tone = 'brand' }: FilterCardProps) {
  const tile = { brand: 'bg-brand-50 text-brand-600', danger: 'bg-danger-soft text-danger', success: 'bg-success-soft text-success' }[tone]
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-white p-4 text-left shadow-card transition-[border-color,box-shadow] duration-base focus-ring',
        active ? 'border-brand-600 ring-1 ring-brand-600' : 'border-ink-200 hover:border-ink-300',
      )}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', tile)}><Icon icon={icon} size="md" /></span>
      <span className="min-w-0">
        <span className="block text-small font-medium text-ink-500">{label}</span>
        <span className="block truncate text-[20px] font-bold tracking-[-0.01em] text-ink-900">{value}</span>
        <span className="block text-caption text-ink-500">{detail}</span>
      </span>
    </button>
  )
}
