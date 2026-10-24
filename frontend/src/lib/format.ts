const currencyFormatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number, currency = 'KES', options: { compact?: boolean } = {}) {
  const key = `${currency}-${options.compact ? 'c' : 'f'}`
  let formatter = currencyFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      notation: options.compact ? 'compact' : 'standard',
      maximumFractionDigits: options.compact ? 1 : 2,
      minimumFractionDigits: options.compact ? 0 : 2,
    })
    currencyFormatters.set(key, formatter)
  }
  // Intl uses a non-breaking space after the code; keep it so amounts never wrap.
  return formatter.format(amount)
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatDate(value: string | Date, style: 'short' | 'medium' | 'long' = 'medium') {
  const date = typeof value === 'string' ? new Date(value) : value
  const options: Intl.DateTimeFormatOptions =
    style === 'short' ? { day: 'numeric', month: 'short' }
      : style === 'long' ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat('en-KE', options).format(date)
}

export function formatRelative(value: string | Date, now = new Date()) {
  const date = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function formatHours(hours: number) {
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  return minutes === 0 ? `${whole}h` : `${whole}h ${minutes.toString().padStart(2, '0')}m`
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('')
}
