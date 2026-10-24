import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatHours } from '../../lib/format'

type Day = { day: string; billable: number; nonBillable: number }

const CHART_1 = '#1A41BA'
const CHART_2 = '#5A8CF7'

function HoursTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const billable = payload.find((p) => p.dataKey === 'billable')?.value ?? 0
  const other = payload.find((p) => p.dataKey === 'nonBillable')?.value ?? 0
  return (
    <div className="rounded-md border border-ink-200 bg-white px-3 py-2 shadow-pop">
      <p className="text-caption font-medium text-ink-500">{label}</p>
      <p className="tnum mt-1 flex items-center gap-2 text-small text-ink-800"><span className="h-2 w-2 rounded-sm" style={{ background: CHART_1 }} />Billable <span className="ml-auto pl-4 font-semibold">{formatHours(billable)}</span></p>
      <p className="tnum flex items-center gap-2 text-small text-ink-800"><span className="h-2 w-2 rounded-sm" style={{ background: CHART_2 }} />Non-billable <span className="ml-auto pl-4 font-semibold">{formatHours(other)}</span></p>
    </div>
  )
}

/** Two series, so a legend is always shown. Segments are separated by a 2px surface gap. */
export function HoursChart({ data }: { data: Day[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-caption text-ink-600" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_1 }} />Billable</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_2 }} />Non-billable</span>
      </div>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#EDF0F5" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#66728A', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#66728A', fontSize: 12 }} allowDecimals={false} tickFormatter={(v: number) => `${v}h`} />
            <Tooltip content={<HoursTooltip />} cursor={{ fill: '#F5F7FA' }} />
            <Bar dataKey="billable" stackId="h" fill={CHART_1} maxBarSize={24} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="nonBillable" stackId="h" fill={CHART_2} maxBarSize={24} radius={[4, 4, 0, 0]} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
