import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export const PAGE_SIZES = [10, 25, 50, 100] as const

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  itemLabel?: string
}

/** Page numbers with ellipses: 1 … 4 5 6 … 12 */
function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => pages.add(p))
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  return sorted.flatMap((p, index) => (index > 0 && p - sorted[index - 1]! > 1 ? ['gap' as const, p] : [p]))
}

const navButton = 'inline-flex h-8 items-center gap-1 rounded-md border border-ink-300 bg-white px-2.5 text-small font-semibold text-ink-700 shadow-xs transition-colors duration-fast hover:bg-ink-50 focus-ring disabled:pointer-events-none disabled:opacity-40'

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, itemLabel = 'results' }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 border-t border-ink-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-4 text-small text-ink-500">
        <p className="tnum" aria-live="polite">
          Showing <span className="font-semibold text-ink-800">{from}–{to}</span> of <span className="font-semibold text-ink-800">{total}</span> {itemLabel}
        </p>
        <label className="hidden items-center gap-2 md:flex">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 cursor-pointer rounded-md border border-ink-300 bg-white pl-2 pr-7 text-small font-semibold text-ink-800 shadow-xs outline-none focus:border-brand-600 focus:shadow-focus"
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className={navButton} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <Icon icon={MdChevronLeft} size="sm" /> Previous
        </button>
        <ul className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <li key={`gap-${index}`} className="w-8 text-center text-small text-ink-400" aria-hidden>…</li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? 'page' : undefined}
                  aria-label={`Page ${item}`}
                  className={cn(
                    'tnum h-8 min-w-8 rounded-md px-2 text-small font-semibold transition-colors duration-fast focus-ring',
                    item === page ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-600 hover:bg-ink-100',
                  )}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ul>
        <span className="tnum px-2 text-small text-ink-500 sm:hidden">Page {page} of {pageCount}</span>
        <button type="button" className={navButton} onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          Next <Icon icon={MdChevronRight} size="sm" />
        </button>
      </div>
    </nav>
  )
}
