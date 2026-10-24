import type { ReactNode } from 'react'
import { Logo } from '../../components/layout/Logo'
import { PaymentRail } from '../../components/ui/Stepper'

/** Split layout: the product promise on the left, a focused form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col bg-brand-950 px-12 py-10 text-white lg:flex xl:px-16">
        <Logo inverted />

        <div className="my-auto max-w-[440px] py-12">
          <h1 className="text-[40px] font-bold leading-[48px] tracking-[-0.025em] text-white">Do the work.<br />Get paid.</h1>
          <p className="mt-4 text-[15px] leading-7 text-white/65">Clients, projects, time and invoices in one place, with M-Pesa payments that settle invoices on their own.</p>

          {/* A real invoice moving along the payment rail: the product's signature element. */}
          <figure className="mt-12 rounded-xl bg-white p-5 text-ink-900 shadow-modal" aria-label="Example invoice">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-small text-ink-500">INV-2026-0046 · Simba Fintech</p>
              <p className="text-caption text-ink-400">Due 29 Oct</p>
            </div>
            <p className="tnum mt-2 text-[28px] font-bold tracking-[-0.02em]">KES 209,989.00</p>
            <div className="mt-4 border-t border-ink-200 pt-4">
              <PaymentRail status="PARTIALLY_PAID" />
              <p className="mt-2 text-caption text-ink-500">KES 100,000 received by M-Pesa · receipt SJK4H7Q2LM</p>
            </div>
          </figure>
        </div>

        <p className="text-caption text-white/45">Invoices with KRA PINs and 16% VAT · M-Pesa STK Push · Client portal</p>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-caption text-ink-400">© {new Date().getFullYear()} KaziPay</p>
      </main>
    </div>
  )
}
