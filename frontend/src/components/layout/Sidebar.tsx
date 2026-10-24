import type { IconType } from 'react-icons'
import {
  MdOutlineFolderOpen, MdOutlinePayments, MdOutlinePeopleAlt, MdOutlineReceiptLong, MdOutlineSettings, MdOutlineSpaceDashboard, MdOutlineTimer, MdUnfoldMore,
} from 'react-icons/md'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { useInvoices, useWorkspace } from '../../lib/queries'
import { Icon } from '../ui/Icon'
import { LogoMark } from './Logo'

type NavItem = { to: string; label: string; icon: IconType; badge?: number }

function NavGroup({ label, items, onNavigate }: { label?: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div>
      {label && <p className="mb-2 px-3 text-overline uppercase text-white/40">{label}</p>}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) => cn(
                'group relative flex h-10 items-center gap-3 rounded-md px-3 text-body font-medium transition-colors duration-fast ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn('absolute left-0 top-2 h-6 w-[3px] rounded-r-full bg-brand-400 transition-opacity duration-base', isActive ? 'opacity-100' : 'opacity-0')} aria-hidden />
                  <Icon icon={item.icon} size="md" className={isActive ? 'text-brand-300' : 'text-white/55 group-hover:text-white/80'} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="tnum rounded-full bg-danger px-1.5 text-[11px] font-bold leading-5 text-white" aria-label={`${item.badge} overdue`}>{item.badge}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: workspace } = useWorkspace()
  const { data: invoices } = useInvoices()
  const overdue = invoices?.filter((invoice) => invoice.status === 'OVERDUE').length

  const main: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: MdOutlineSpaceDashboard },
    { to: '/clients', label: 'Clients', icon: MdOutlinePeopleAlt },
    { to: '/projects', label: 'Projects', icon: MdOutlineFolderOpen },
    { to: '/time', label: 'Time', icon: MdOutlineTimer },
  ]
  const money: NavItem[] = [
    { to: '/invoices', label: 'Invoices', icon: MdOutlineReceiptLong, badge: overdue },
    { to: '/payments', label: 'Payments', icon: MdOutlinePayments },
  ]

  return (
    <div className="flex h-full flex-col bg-brand-950 text-white">
      <div className="px-4 pb-4 pt-5">
        <button type="button" className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-fast hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <LogoMark className="h-9 w-9" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-semibold">{workspace?.name ?? 'KaziPay'}</span>
            <span className="block text-caption text-white/50">{workspace ? `${workspace.plan.name} plan` : ' '}</span>
          </span>
          <Icon icon={MdUnfoldMore} size="sm" className="text-white/40" />
        </button>
      </div>

      <nav aria-label="Main" className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <NavGroup label="Workspace" items={main} onNavigate={onNavigate} />
        <NavGroup label="Money" items={money} onNavigate={onNavigate} />
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        <div className="rounded-lg bg-white/[0.06] p-3.5">
          <p className="text-small font-semibold">Get paid faster</p>
          <p className="mt-1 text-caption leading-[18px] text-white/60">Connect your M-Pesa Paybill so clients can pay invoices in one tap.</p>
          <NavLink to="/settings" onClick={onNavigate} className="mt-2.5 inline-flex text-caption font-semibold text-brand-300 hover:text-white">Set up M-Pesa</NavLink>
        </div>
        <NavGroup items={[{ to: '/settings', label: 'Settings', icon: MdOutlineSettings }]} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
