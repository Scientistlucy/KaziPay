import type { ReactNode } from 'react'
import { MdCheck, MdOutlinePhoneIphone } from 'react-icons/md'
import { Icon } from '../../components/ui/Icon'
import { Logo } from '../../components/layout/Logo'

/** Split layout: a brand panel that shows the product promise, and a focused form column. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-950 px-12 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)', backgroundSize: '44px 44px' }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/25 blur-3xl" aria-hidden />
        <div className="relative"><Logo inverted /></div>

        <div className="relative my-auto max-w-[460px] py-12">
          <p className="text-overline uppercase text-brand-300">For consultants and small agencies</p>
          <h1 className="mt-4 text-[40px] font-bold leading-[48px] tracking-[-0.025em] text-white">Do the work.<br />Get paid.</h1>
          <p className="mt-4 text-[15px] leading-7 text-white/70">Clients, projects, time and invoices in one calm workspace, with M-Pesa payments that settle your invoices automatically.</p>

          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm" aria-hidden>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-white/55">INV-2026-0046 · Simba Fintech</p>
                <p className="tnum mt-1 text-[22px] font-bold tracking-[-0.02em]">KES 210,000.00</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E9E6A]/20 px-2.5 py-1 text-caption font-semibold text-[#7BE0B5]">
                <Icon icon={MdCheck} size="xs" />Paid
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-white/[0.06] p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/30 text-brand-200"><Icon icon={MdOutlinePhoneIphone} size="md" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-small font-semibold">M-Pesa payment received</p>
                <p className="text-caption text-white/55">Receipt SJK4H7Q2LM · reconciled automatically</p>
              </div>
            </div>
          </div>
        </div>

        <ul className="relative grid grid-cols-3 gap-6 border-t border-white/10 pt-6 text-small text-white/65">
          <li><span className="block text-[20px] font-bold text-white">2 min</span>to send an invoice</li>
          <li><span className="block text-[20px] font-bold text-white">1 tap</span>for clients to pay</li>
          <li><span className="block text-[20px] font-bold text-white">0</span>spreadsheets to reconcile</li>
        </ul>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-caption text-ink-400">© {new Date().getFullYear()} KaziPay · Privacy · Terms</p>
      </main>
    </div>
  )
}
