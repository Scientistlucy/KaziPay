import * as Dropdown from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { MdCheck } from 'react-icons/md'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export function Menu({ trigger, children, align = 'end', width = 'w-56' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end'; width?: string }) {
  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align={align}
          sideOffset={6}
          className={cn('z-50 rounded-lg border border-ink-200 bg-white p-1.5 shadow-pop animate-content-in', width)}
        >
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

type MenuItemProps = { icon?: IconType; children: ReactNode; onSelect?: () => void; danger?: boolean; shortcut?: string; disabled?: boolean }

export function MenuItem({ icon, children, onSelect, danger, shortcut, disabled }: MenuItemProps) {
  return (
    <Dropdown.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-body outline-none transition-colors duration-fast',
        danger ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-ink-700 data-[highlighted]:bg-ink-100 data-[highlighted]:text-ink-900',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      )}
    >
      {icon && <Icon icon={icon} size="sm" className={danger ? undefined : 'text-ink-500'} />}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-caption text-ink-400">{shortcut}</span>}
    </Dropdown.Item>
  )
}

export function MenuCheckboxItem({ checked, onCheckedChange, children }: { checked: boolean; onCheckedChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <Dropdown.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={(event) => event.preventDefault()}
      className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-body text-ink-700 outline-none data-[highlighted]:bg-ink-100"
    >
      <span className={cn('flex h-4 w-4 items-center justify-center rounded-[4px] border', checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300')}>
        <Dropdown.ItemIndicator><Icon icon={MdCheck} size="xs" /></Dropdown.ItemIndicator>
      </span>
      {children}
    </Dropdown.CheckboxItem>
  )
}

export const MenuSeparator = () => <Dropdown.Separator className="-mx-1.5 my-1.5 h-px bg-ink-200" />
export const MenuLabel = ({ children }: { children: ReactNode }) => <Dropdown.Label className="px-2.5 pb-1 pt-1.5 text-overline uppercase text-ink-400">{children}</Dropdown.Label>
