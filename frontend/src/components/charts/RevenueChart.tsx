import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '../../lib/format'

type Point = { month: string; collected: number }

const BRAND_600 = 'rgb(31 81 224)'
const INK_100 = '#EDF0F5'
const INK_500 = '#66728A'

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-ink-200 bg-white px-3 py-2 shadow-pop">
      <p className="text-caption font-medium text-ink-500">{label}</p>
      <p className="tnum mt-0.5 text-small font-semibold text-ink-900">{formatMoney(payload[0]!.value)}</p>
      <p className="text-caption text-ink-500">collected</p>
    </div>
  )
}

/** Single series (collected revenue), so the card title names it and no legend box is needed. */
export function RevenueChart({ data }: { data: Point[] }) {
  const last = data.length - 1
  return (
    <div className="h-[260px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_600} stopOpacity={0.14} />
              <stop offset="100%" stopColor={BRAND_600} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={INK_100} strokeWidth={1} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: INK_500, fontSize: 12 }} dy={8} interval="preserveStartEnd" minTickGap={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: INK_500, fontSize: 12 }}
            tickFormatter={(value: number) => (value === 0 ? '0' : `${Math.round(value / 1000)}K`)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#C9D1DD', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="collected"
            stroke={BRAND_600}
            strokeWidth={2}
            fill="url(#revenueWash)"
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: BRAND_600 }}
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.index === last && props.cx !== undefined && props.cy !== undefined ? (
                <circle key="end" cx={props.cx} cy={props.cy} r={5} fill={BRAND_600} stroke="#fff" strokeWidth={2} />
              ) : <g key={props.index} />}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
