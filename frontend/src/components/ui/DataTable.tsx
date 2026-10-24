import { useMemo, useState, type ReactNode } from 'react'
import { MdArrowDownward, MdArrowUpward, MdClose, MdOutlineViewColumn, MdUnfoldMore } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Button, IconButton } from './Button'
import { Checkbox } from './Field'
import { Icon } from './Icon'
import { Menu, MenuCheckboxItem, MenuLabel } from './Menu'
import { Pagination } from './Pagination'
import { Skeleton } from './Skeleton'

export type Column<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  sortValue?: (row: T) => string | number
  /** Can be hidden from the column menu. The first column never is. */
  hideable?: boolean
  defaultHidden?: boolean
  className?: string
}

type DataTableProps<T> = {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  loading?: boolean
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => ReactNode
  /** Renders when rows are selected; receives the selected ids and a clear function. */
  bulkActions?: (selected: string[], clear: () => void) => ReactNode
  /** Mobile (< 768px) card rendering of a row. */
  mobileCard: (row: T) => ReactNode
  toolbar?: ReactNode
  empty?: ReactNode
  itemLabel?: string
  initialSort?: { id: string; direction: 'asc' | 'desc' }
  rowLabel: (row: T) => string
}

export function DataTable<T>({
  rows, columns, getRowId, loading, onRowClick, rowActions, bulkActions, mobileCard, toolbar, empty, itemLabel = 'results', initialSort, rowLabel,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  const [hidden, setHidden] = useState<string[]>(() => columns.filter((c) => c.defaultHidden).map((c) => c.id))

  const visibleColumns = columns.filter((column) => !hidden.includes(column.id))
  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.id === sort.id)
    if (!column?.sortValue) return rows
    const direction = sort!.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a)
      const right = column.sortValue!(b)
      return (left < right ? -1 : left > right ? 1 : 0) * direction
    })
  }, [rows, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const pageIds = pageRows.map(getRowId)
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id))
  const someOnPageSelected = pageIds.some((id) => selected.includes(id))
  const clearSelection = () => setSelected([])

  const toggleSort = (id: string) =>
    setSort((current) => (current?.id !== id ? { id, direction: 'asc' } : current.direction === 'asc' ? { id, direction: 'desc' } : null))

  const hideableColumns = columns.filter((column, index) => index > 0 && column.hideable)
  const showToolbar = toolbar || hideableColumns.length > 0 || selected.length > 0

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card">
      {showToolbar && (
        <div className="flex min-h-[60px] flex-wrap items-center gap-3 border-b border-ink-200 px-4 py-3 sm:px-5">
          {selected.length > 0 && bulkActions ? (
            <div className="flex w-full flex-wrap items-center gap-3 animate-overlay-in">
              <span className="tnum text-small font-semibold text-ink-800">{selected.length} selected</span>
              <div className="flex flex-wrap items-center gap-2">{bulkActions(selected, clearSelection)}</div>
              <Button variant="tertiary" size="sm" leadingIcon={MdClose} onClick={clearSelection} className="ml-auto">Clear selection</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-wrap items-center gap-3">{toolbar}</div>
              {hideableColumns.length > 0 && (
                <Menu trigger={<IconButton icon={MdOutlineViewColumn} label="Show or hide columns" variant="secondary" size="sm" className="hidden md:inline-flex" />}>
                  <MenuLabel>Columns</MenuLabel>
                  {hideableColumns.map((column) => (
                    <MenuCheckboxItem
                      key={column.id}
                      checked={!hidden.includes(column.id)}
                      onCheckedChange={(checked) => setHidden((current) => (checked ? current.filter((id) => id !== column.id) : [...current, column.id]))}
                    >
                      {column.header}
                    </MenuCheckboxItem>
                  ))}
                </Menu>
              )}
            </>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton columns={visibleColumns.length} />
      ) : rows.length === 0 ? (
        empty
      ) : (
        <>
          {/* Desktop and tablet: real table */}
          <div className="scrollbar-thin hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="h-10 border-b border-ink-200 bg-ink-25">
                  {bulkActions && (
                    <th scope="col" className="w-12 pl-5">
                      <Checkbox
                        aria-label="Select all rows on this page"
                        checked={allOnPageSelected}
                        ref={(element) => { if (element) element.indeterminate = someOnPageSelected && !allOnPageSelected }}
                        onChange={() => setSelected((current) => (allOnPageSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]))}
                      />
                    </th>
                  )}
                  {visibleColumns.map((column, index) => {
                    const active = sort?.id === column.id
                    const ariaSort = active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        aria-sort={column.sortValue ? ariaSort ?? 'none' : undefined}
                        className={cn('whitespace-nowrap px-4 text-overline uppercase text-ink-500', index === 0 && !bulkActions && 'pl-5', column.align === 'right' && 'text-right', column.className)}
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.id)}
                            className={cn('group inline-flex items-center gap-1 rounded-sm uppercase hover:text-ink-800 focus-ring', active && 'text-ink-800', column.align === 'right' && 'flex-row-reverse')}
                          >
                            {column.header}
                            <Icon
                              icon={active ? (sort!.direction === 'asc' ? MdArrowUpward : MdArrowDownward) : MdUnfoldMore}
                              size="xs"
                              className={cn(active ? 'text-brand-600' : 'text-ink-300 group-hover:text-ink-500')}
                            />
                          </button>
                        ) : column.header}
                      </th>
                    )
                  })}
                  {rowActions && <th scope="col" className="w-14"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const id = getRowId(row)
                  const isSelected = selected.includes(id)
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        'h-14 border-b border-ink-200 transition-colors duration-fast last:border-b-0',
                        isSelected ? 'bg-brand-50/70' : 'hover:bg-ink-50',
                        onRowClick && 'cursor-pointer',
                      )}
                    >
                      {bulkActions && (
                        <td className="pl-5" onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select ${rowLabel(row)}`}
                            checked={isSelected}
                            onChange={() => setSelected((current) => (isSelected ? current.filter((value) => value !== id) : [...current, id]))}
                          />
                        </td>
                      )}
                      {visibleColumns.map((column, index) => (
                        <td key={column.id} className={cn('px-4 text-body', index === 0 && !bulkActions && 'pl-5', column.align === 'right' && 'tnum text-right', column.className)}>
                          {column.cell(row)}
                        </td>
                      ))}
                      {rowActions && <td className="pr-3 text-right" onClick={(event) => event.stopPropagation()}>{rowActions(row)}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-ink-200 md:hidden">
            {pageRows.map((row) => (
              <li key={getRowId(row)}>
                <div
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (event) => { if (event.key === 'Enter') onRowClick(row) } : undefined}
                  className="flex items-start gap-3 px-4 py-4 transition-colors active:bg-ink-50 focus-ring"
                >
                  <div className="min-w-0 flex-1">{mobileCard(row)}</div>
                  {rowActions && <div onClick={(event) => event.stopPropagation()}>{rowActions(row)}</div>}
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={sorted.length}
            itemLabel={itemLabel}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </>
      )}
    </div>
  )
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-10 border-b border-ink-200 bg-ink-25" />
      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} className="flex h-14 items-center gap-6 border-b border-ink-200 px-5 last:border-b-0">
          <div className="flex w-56 items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/2" /></div>
          </div>
          {Array.from({ length: Math.max(0, columns - 1) }, (_, cell) => (
            <Skeleton key={cell} className={cn('hidden h-3 flex-1 md:block', cell === columns - 2 && 'max-w-[90px]')} />
          ))}
        </div>
      ))}
    </div>
  )
}
