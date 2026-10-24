import type { Invoice } from '../types'

export function invoiceTotals(invoice: Pick<Invoice, 'items' | 'amountPaid'>) {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0)
  const total = Math.round((subtotal + tax) * 100) / 100
  return { subtotal, tax, total, balance: Math.max(0, total - invoice.amountPaid) }
}

export function daysUntil(iso: string, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const date = new Date(iso)
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round((target - start) / 86_400_000)
}

export function dueLabel(iso: string) {
  const days = daysUntil(iso)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1) return `Due in ${days} days`
  return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`
}
