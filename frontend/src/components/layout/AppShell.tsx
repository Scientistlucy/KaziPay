import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import {
  MdLogout, MdMenu, MdNotificationsNone, MdOutlineHelpOutline, MdOutlinePersonOutline, MdOutlineSettings, MdPause, MdPlayArrow, MdSearch,
} from 'react-icons/md'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { currentUser } from '../../mocks/data'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu'
import { Kbd } from '../ui/Page'
import { useToast } from '../ui/Toast'
import { Tooltip } from '../ui/Tooltip'
import { CommandPalette } from './CommandPalette'
import { SidebarContent } from './Sidebar'
import { formatClock, TimerProvider, useTimer } from './timer'

function TimerWidget() {
  const { running, elapsed, stop, start } = useTimer()
  const toast = useToast()
  const navigate = useNavigate()

  if (!running) {
    return (
      <button
        type="button"
        onClick={() => start({ projectId: 'pr_1', projectName: 'Fleet tracking dashboard', description: 'General work' })}
        className="hidden h-9 items-center gap-2 rounded-full border border-ink-200 bg-white pl-2 pr-3.5 text-small font-semibold text-ink-700 shadow-xs transition-colors duration-fast hover:border-ink-300 hover:bg-ink-50 focus-ring sm:inline-flex"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white"><Icon icon={MdPlayArrow} size="sm" /></span>
        Start timer
      </button>
    )
  }

  return (
    <div className="hidden items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-1 pl-1 pr-3 sm:flex">
      <Tooltip content="Stop and save time entry">
        <button
          type="button"
          aria-label="Stop timer"
          onClick={() => {
            const entry = stop()
            if (entry) toast({ title: `Logged ${formatClock(entry.seconds)} to ${entry.projectName}`, description: 'Saved to this week’s timesheet.', action: { label: 'View timesheet', onClick: () => navigate('/time') } })
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white transition-colors duration-fast hover:bg-brand-700 focus-ring"
        >
          <Icon icon={MdPause} size="sm" />
        </button>
      </Tooltip>
      <span className="relative ml-1.5 flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
      </span>
      <span className="ml-1.5 hidden max-w-[160px] truncate text-small font-medium text-brand-900 lg:inline">{running.projectName}</span>
      <span className="tnum ml-2 text-small font-bold text-brand-800" aria-live="off">{formatClock(elapsed)}</span>
    </div>
  )
}

function Topbar({ onOpenNav, onOpenSearch }: { onOpenNav: () => void; onOpenSearch: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <IconButton icon={MdMenu} label="Open navigation" className="-ml-2 lg:hidden" onClick={onOpenNav} tooltip={false} />
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-10 flex-1 items-center gap-2.5 rounded-md border border-ink-200 bg-ink-25 px-3 text-left text-body text-ink-400 transition-colors duration-fast hover:border-ink-300 hover:bg-white focus-ring sm:max-w-md"
      >
        <Icon icon={MdSearch} size="md" />
        <span className="flex-1 truncate">Search or jump to…</span>
        <span className="hidden items-center gap-1 sm:flex"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
      </button>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <TimerWidget />
        <IconButton icon={MdOutlineHelpOutline} label="Help and shortcuts" className="hidden sm:inline-flex" onClick={() => toast({ tone: 'info', title: 'Press Ctrl K anywhere', description: 'Search clients, projects and invoices, or jump to any page.' })} />
        <Menu
          width="w-80"
          trigger={
            <button type="button" aria-label="Notifications, 3 unread" className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-600 transition-colors duration-fast hover:bg-ink-100 focus-ring">
              <Icon icon={MdNotificationsNone} size="md" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-white" aria-hidden />
            </button>
          }
        >
          <MenuLabel>Notifications</MenuLabel>
          <MenuItem onSelect={() => navigate('/invoices/in_0046')}>Simba Fintech paid KES 100,000 by M-Pesa</MenuItem>
          <MenuItem onSelect={() => navigate('/invoices/in_0047')}>Baraka Health Clinics viewed INV-2026-0047</MenuItem>
          <MenuItem onSelect={() => navigate('/time')}>Grace Wambui submitted 38h for approval</MenuItem>
        </Menu>
        <Menu
          trigger={
            <button type="button" aria-label="Account menu" className="ml-1 rounded-full focus-ring">
              <Avatar name={currentUser.name} size="sm" />
            </button>
          }
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-small font-semibold text-ink-900">{currentUser.name}</p>
            <p className="text-caption text-ink-500">{currentUser.email}</p>
          </div>
          <MenuSeparator />
          <MenuItem icon={MdOutlinePersonOutline} onSelect={() => navigate('/settings')}>Profile</MenuItem>
          <MenuItem icon={MdOutlineSettings} onSelect={() => navigate('/settings')}>Workspace settings</MenuItem>
          <MenuSeparator />
          <MenuItem icon={MdLogout} onSelect={() => navigate('/login')}>Sign out</MenuItem>
        </Menu>
      </div>
    </header>
  )
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Each navigation starts at the top, like a page load.
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  return (
    <TimerProvider>
      <div className="min-h-screen">
        <a href="#main" className="sr-only z-50 rounded-md bg-white px-4 py-2 text-body font-semibold text-brand-700 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><SidebarContent /></aside>

        <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-ink-900/45 animate-overlay-in lg:hidden" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(288px,85vw)] shadow-modal outline-none animate-drawer-in lg:hidden">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Dialog.Description className="sr-only">Main navigation</Dialog.Description>
              <SidebarContent onNavigate={() => setNavOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className={cn('flex min-h-screen flex-col lg:pl-64')}>
          <Topbar onOpenNav={() => setNavOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
          <main id="main" className="flex-1" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TimerProvider>
  )
}
