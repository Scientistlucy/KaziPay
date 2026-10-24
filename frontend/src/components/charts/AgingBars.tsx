import { formatMoney } from '../../lib/format'
import { Tooltip } from '../ui/Tooltip'

type Bucket = { bucket: string; amount: number; overdue: boolean }

/** Accounts-receivable aging: ordered buckets, one measure, so one color. Values sit at the bar tips. */
export function AgingBars({ data }: { data: Bucket[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  const total = data.reduce((sum, d) => sum + d.amount, 0)
  return (
    <ul className="space-y-4">
      {data.map((bucket) => {
        const share = total ? Math.round((bucket.amount / total) * 100) : 0
        return (
          <li key={bucket.bucket}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-small font-medium text-ink-700">{bucket.bucket}</span>
              <span className="tnum text-caption text-ink-500">{share}%</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1">
                <Tooltip content={`${bucket.bucket}: ${formatMoney(bucket.amount)} (${share}% of receivables)`}>
                  <div
                    tabIndex={0}
                    aria-label={`${bucket.bucket}: ${formatMoney(bucket.amount)}`}
                    className="h-3 rounded-r-[4px] bg-brand-600 transition-opacity duration-fast hover:opacity-85 focus-ring"
                    style={{ width: bucket.amount === 0 ? 0 : `${Math.max(2, (bucket.amount / max) * 100)}%` }}
                  />
                </Tooltip>
              </div>
              <span className="tnum w-[88px] shrink-0 text-right text-small font-semibold text-ink-900">{formatMoney(bucket.amount, 'KES', { compact: true })}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
