import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

test('renders the authentication shell', () => {
  render(<QueryClientProvider client={new QueryClient()}><BrowserRouter><App /></BrowserRouter></QueryClientProvider>)
  expect(screen.getByRole('heading', { name: 'A calmer way to run client work.' })).toBeInTheDocument()
})