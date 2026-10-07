import { Link, Route, Routes } from 'react-router-dom'
import { api } from './lib/api'

function AuthShell() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link className="text-xl font-semibold tracking-tight" to="/">KaziPay</Link>
          <span className="text-sm text-slate-400">Do the work. Get paid.</span>
        </nav>
        <div className="grid gap-12 py-20 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-cyan-300">Consultant workspace</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">A calmer way to run client work.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">Projects, time, invoices, and M-Pesa payments in one focused workspace.</p>
          </div>
          <div className="border border-slate-700 bg-slate-900 p-8 shadow-2xl shadow-cyan-950/20">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void api.get('/health') }}>
              <label className="block text-sm text-slate-300">Email<input className="mt-2 w-full border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-300" type="email" required /></label>
              <label className="block text-sm text-slate-300">Password<input className="mt-2 w-full border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-cyan-300" type="password" required /></label>
              <button className="w-full bg-cyan-300 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-200" type="submit">Continue</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  return <Routes><Route path="*" element={<AuthShell />} /></Routes>
}