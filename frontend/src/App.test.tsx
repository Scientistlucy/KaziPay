import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from './test/render'

// Mock API calls resolve after a simulated network delay of up to ~900ms.
const slow = { timeout: 3000 }

test('sign-in page validates before submitting', async () => {
  renderApp('/login')
  expect(await screen.findByRole('heading', { name: 'Welcome back' }, slow)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByText('Enter your email address')).toBeInTheDocument()
  expect(screen.getByText('Enter your password')).toBeInTheDocument()
})

test('dashboard shows skeletons, then key figures', async () => {
  renderApp('/')
  expect((await screen.findByText('Loading dashboard', {}, slow)).closest('[role="status"]')).toHaveAttribute('aria-busy', 'true')

  expect(await screen.findByText('Collected this month', {}, slow)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Revenue collected' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Needs your attention' })).toBeInTheDocument()
})

test('client search shows a no-results state that can be cleared', async () => {
  renderApp('/clients')
  await screen.findAllByText('Savanna Logistics Ltd', {}, slow)

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search clients' }), { target: { value: 'zzz-no-match' } })
  expect(screen.getByText('No results for "zzz-no-match"')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect((await screen.findAllByText('Savanna Logistics Ltd')).length).toBeGreaterThan(0)
})

test('new client form requires a name and rejects an invalid email', async () => {
  renderApp('/clients?new=1')
  const dialog = await screen.findByRole('dialog', { name: 'New client' }, slow)

  fireEvent.change(within(dialog).getByLabelText(/^Email/), { target: { value: 'not-an-email' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add client' }))

  expect(await within(dialog).findByText('Client name is required')).toBeInTheDocument()
  expect(within(dialog).getByText(/Enter a valid email address/)).toBeInTheDocument()
})

test('unknown routes show a helpful not-found page', async () => {
  renderApp('/does-not-exist')
  expect(await screen.findByRole('heading', { name: 'This page doesn’t exist' }, slow)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/')
})
