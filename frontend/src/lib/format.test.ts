import { formatHours, formatMoney, initials } from './format'
import { dueLabel, invoiceTotals } from './invoice'

const normalize = (value: string) => value.replace(/ /g, ' ')

describe('formatMoney', () => {
  test('formats full amounts with the currency code and two decimals', () => {
    expect(normalize(formatMoney(184005))).toBe('KES 184,005.00')
    expect(normalize(formatMoney(2001, 'USD'))).toBe('USD 2,001.00')
  })

  test('compacts large amounts for dashboards', () => {
    expect(normalize(formatMoney(343_500, 'KES', { compact: true }))).toBe('KES 343.5K')
  })
})

describe('formatHours', () => {
  test('shows whole and partial hours', () => {
    expect(formatHours(8)).toBe('8h')
    expect(formatHours(30.5)).toBe('30h 30m')
    expect(formatHours(0.25)).toBe('0h 15m')
  })
})

test('initials uses the first two words', () => {
  expect(initials('Savanna Logistics Ltd')).toBe('SL')
  expect(initials('Amina')).toBe('A')
})

describe('invoiceTotals', () => {
  test('adds 16% VAT per line and subtracts payments from the balance', () => {
    const totals = invoiceTotals({
      items: [{ description: 'Engineering', quantity: 10, unitPrice: 5000, taxRate: 16 }, { description: 'QA', quantity: 1, unitPrice: 25000, taxRate: 16 }],
      amountPaid: 50000,
    })
    expect(totals).toEqual({ subtotal: 75000, tax: 12000, total: 87000, balance: 37000 })
  })

  test('never reports a negative balance when a client overpays', () => {
    expect(invoiceTotals({ items: [{ description: 'Fee', quantity: 1, unitPrice: 100, taxRate: 0 }], amountPaid: 150 }).balance).toBe(0)
  })
})

test('dueLabel describes upcoming and overdue dates', () => {
  const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
  expect(dueLabel(inDays(0))).toBe('Due today')
  expect(dueLabel(inDays(1))).toBe('Due tomorrow')
  expect(dueLabel(inDays(5))).toBe('Due in 5 days')
  expect(dueLabel(inDays(-1))).toBe('1 day overdue')
  expect(dueLabel(inDays(-7))).toBe('7 days overdue')
})
