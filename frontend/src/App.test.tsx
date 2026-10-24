import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from './test/render'

// Mock API calls resolve after a simulated network delay of up to ~900ms, and the first load
// of a lazy page compiles its chunk (the dashboard pulls in Recharts), which is slow under jsdom.
const slow = { timeout: 10000 }

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
  expect(screen.getByRole('heading', { name: 'Needs attention' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Finish setting up' })).toBeInTheDocument()
})

test('client search shows a no-results state that can be cleared', async () => {
  renderApp('/clients')
  await screen.findAllByText('Savanna Logistics Ltd', {}, slow)

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search clients' }), { target: { value: 'zzz-no-match' } })
  expect(screen.getByText('No results for "zzz-no-match"')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect((await screen.findAllByText('Savanna Logistics Ltd')).length).toBeGreaterThan(0)
})

test('new client form validates step one before moving to billing', async () => {
  renderApp('/clients?new=1')
  const dialog = await screen.findByRole('dialog', { name: 'New client' }, slow)

  fireEvent.change(within(dialog).getByLabelText(/^Email/), { target: { value: 'not-an-email' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Continue to billing' }))

  expect(await within(dialog).findByText('Client name is required')).toBeInTheDocument()
  expect(within(dialog).getByText(/Enter a valid email address/)).toBeInTheDocument()

  fireEvent.change(within(dialog).getByLabelText(/^Client or company name/), { target: { value: 'Acme Ltd' } })
  fireEvent.change(within(dialog).getByLabelText(/^Email/), { target: { value: 'accounts@acme.co.ke' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Continue to billing' }))

  expect(await within(dialog).findByLabelText(/^Payment terms/)).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Add client' })).toBeInTheDocument()
})

test('registration moves from account details to workspace details', async () => {
  renderApp('/register')
  await screen.findByRole('heading', { name: 'Create your account' }, slow)

  fireEvent.change(screen.getByLabelText(/^Your name/), { target: { value: 'Amina Odhiambo' } })
  fireEvent.change(screen.getByLabelText(/^Work email/), { target: { value: 'amina@studio.co.ke' } })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'correct-horse-9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

  expect(await screen.findByRole('heading', { name: 'Set up your workspace' })).toBeInTheDocument()
  expect(screen.getByText('Your account').closest('li')).not.toHaveAttribute('aria-current')
})

test('unknown routes show a helpful not-found page', async () => {
  renderApp('/does-not-exist')
  expect(await screen.findByRole('heading', { name: 'This page doesn’t exist' }, slow)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/')
})
