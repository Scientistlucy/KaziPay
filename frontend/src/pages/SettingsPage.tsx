import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type CSSProperties } from 'react'
import { useForm } from 'react-hook-form'
import type { IconType } from 'react-icons'
import {
  MdAdd, MdCheck, MdDeleteOutline, MdMoreHoriz, MdOutlineBadge, MdOutlineBusiness, MdOutlineCreditCard, MdOutlineGroup, MdOutlinePalette, MdOutlinePercent,
  MdOutlineSend, MdOutlineUploadFile,
} from 'react-icons/md'
import { z } from 'zod'
import { Avatar } from '../components/ui/Avatar'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { Menu, MenuItem, MenuSeparator } from '../components/ui/Menu'
import { PageContainer, PageHeader } from '../components/ui/Page'
import { ProgressBar } from '../components/ui/Progress'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/cn'
import { formatMoney, formatRelative } from '../lib/format'
import { useTaxRates, useTeam, useUpdateWorkspace, useWorkspace } from '../lib/queries'
import type { TeamMember, Workspace } from '../types'

type Section = 'workspace' | 'branding' | 'tax' | 'team' | 'billing'
const sections: { id: Section; label: string; icon: IconType; description: string }[] = [
  { id: 'workspace', label: 'Workspace', icon: MdOutlineBusiness, description: 'Business details on invoices' },
  { id: 'branding', label: 'Branding', icon: MdOutlinePalette, description: 'Logo and portal colors' },
  { id: 'tax', label: 'Tax rates', icon: MdOutlinePercent, description: 'VAT and withholding' },
  { id: 'team', label: 'Team', icon: MdOutlineGroup, description: 'Members and roles' },
  { id: 'billing', label: 'Plan and billing', icon: MdOutlineCreditCard, description: 'Subscription and usage' },
]

export function SettingsPage() {
  const [section, setSection] = useState<Section>('workspace')
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<Section | null>(null)

  const go = (next: Section) => { if (next === section) return; if (dirty) setPending(next); else setSection(next) }

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Manage your workspace, branding, taxes and team." />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="scrollbar-thin -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {sections.map((item) => {
            const active = item.id === section
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-fast focus-ring',
                  active ? 'bg-white text-ink-900 shadow-card ring-1 ring-ink-200' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )}
              >
                <Icon icon={item.icon} size="md" className={active ? 'text-brand-600' : 'text-ink-400'} />
                <span>
                  <span className="block text-body font-semibold">{item.label}</span>
                  <span className="hidden text-caption text-ink-500 lg:block">{item.description}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="min-w-0">
          {section === 'workspace' && <WorkspaceSection onDirtyChange={setDirty} />}
          {section === 'branding' && <BrandingSection />}
          {section === 'tax' && <TaxSection />}
          {section === 'team' && <TeamSection />}
          {section === 'billing' && <BillingSection />}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title="Leave without saving?"
        description="You have unsaved changes to your workspace details. They’ll be lost if you switch sections."
        confirmLabel="Discard changes"
        onConfirm={() => { setDirty(false); setSection(pending!); setPending(null) }}
      />
    </PageContainer>
  )
}

const workspaceSchema = z.object({
  name: z.string().trim().min(2, 'Enter your business name').max(255),
  businessEmail: z.string().trim().email('Enter a valid email address'),
  businessPhone: z.string().trim().max(50),
  address: z.string().trim(),
  taxId: z.string().trim().regex(/^([A-Z]\d{9}[A-Z])?$/, 'KRA PINs look like P051234567X'),
  defaultCurrency: z.string().length(3),
  timezone: z.string(),
  invoicePrefix: z.string().trim().min(1, 'Add a prefix').max(10, 'Keep it to 10 characters or fewer').regex(/^[A-Z0-9-]+$/, 'Use capital letters, numbers or hyphens'),
  defaultTermsDays: z.coerce.number().int().min(0, 'Terms cannot be negative').max(365),
})
type WorkspaceValues = z.infer<typeof workspaceSchema>

function pickWorkspace(workspace: Workspace): WorkspaceValues {
  const { name, businessEmail, businessPhone, address, taxId, defaultCurrency, timezone, invoicePrefix, defaultTermsDays } = workspace
  return { name, businessEmail, businessPhone, address, taxId, defaultCurrency, timezone, invoicePrefix, defaultTermsDays }
}

function WorkspaceSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const toast = useToast()
  const workspace = useWorkspace()
  const update = useUpdateWorkspace()
  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<WorkspaceValues>({ resolver: zodResolver(workspaceSchema), mode: 'onBlur' })

  useEffect(() => { if (workspace.data) reset(pickWorkspace(workspace.data)) }, [workspace.data, reset])
  useEffect(() => { onDirtyChange(isDirty) }, [isDirty, onDirtyChange])
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  const prefix = watch('invoicePrefix')
  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync(values)
      reset(pickWorkspace(saved))
      toast({ title: 'Workspace details saved', description: 'New invoices will use these details.' })
    } catch {
      toast({ tone: 'danger', title: 'Couldn’t save your changes', description: 'Your edits are still here. Try again.' })
    }
  })

  if (workspace.isPending) return <Card className="space-y-5 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</Card>

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Card>
        <CardHeader title="Business details" description="Shown on invoices, receipts and the client portal." divider />
        <CardBody className="space-y-4 py-5">
          <Field label="Business name" required error={errors.name?.message}><Input {...register('name')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business email" required error={errors.businessEmail?.message}><Input type="email" {...register('businessEmail')} /></Field>
            <Field label="Phone" optional error={errors.businessPhone?.message}><Input type="tel" {...register('businessPhone')} /></Field>
          </div>
          <Field label="Address" optional><Textarea rows={2} {...register('address')} /></Field>
          <Field label="KRA PIN" optional error={errors.taxId?.message} help="Required on tax invoices in Kenya"><Input placeholder="P051234567X" {...register('taxId')} /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Invoicing defaults" description="Applied to new clients and invoices. Existing invoices don’t change." divider />
        <CardBody className="space-y-4 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency" required><Select {...register('defaultCurrency')}>{['KES', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Payment terms" required error={errors.defaultTermsDays?.message}><Input type="number" min={0} trailing={<span className="pr-2 text-small text-ink-500">days</span>} {...register('defaultTermsDays')} /></Field>
            <Field label="Time zone" required><Select {...register('timezone')}><option value="Africa/Nairobi">Nairobi (EAT)</option><option value="Africa/Kampala">Kampala (EAT)</option><option value="Africa/Lagos">Lagos (WAT)</option><option value="Europe/London">London</option></Select></Field>
          </div>
          <Field label="Invoice number prefix" required error={errors.invoicePrefix?.message} help={<>Next invoice: <span className="font-semibold text-ink-700">{(prefix || 'INV')}-{new Date().getFullYear()}-0050</span></>}>
            <Input className="sm:max-w-[200px]" {...register('invoicePrefix')} />
          </Field>
        </CardBody>
      </Card>

      <div className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-[box-shadow,border-color] duration-base',
        isDirty ? 'sticky bottom-4 z-20 border-ink-200 bg-white shadow-pop' : 'border-ink-200 bg-white/60',
      )}>
        <p className="flex items-center gap-2 text-small font-semibold text-ink-800" aria-live="polite">
          {isDirty ? <><span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden />You have unsaved changes</> : <span className="font-normal text-ink-500">All changes saved</span>}
        </p>
        <div className="flex gap-2">
          <Button variant="tertiary" disabled={!isDirty || update.isPending} onClick={() => workspace.data && reset(pickWorkspace(workspace.data))}>Discard</Button>
          <Button type="submit" disabled={!isDirty} loading={update.isPending}>Save changes</Button>
        </div>
      </div>
    </form>
  )
}

// Portal brand presets stay in the blue family; a tenant's own color arrives with white-label (Phase 3).
const brandPresets = [
  { name: 'KaziPay blue', hex: '#1F51E0', vars: { 50: '239 244 255', 100: '220 231 254', 600: '31 81 224', 700: '26 65 186', 950: '14 26 64' } },
  { name: 'Ocean', hex: '#0B6BCB', vars: { 50: '236 246 255', 100: '213 234 253', 600: '11 107 203', 700: '9 86 163', 950: '6 32 61' } },
  { name: 'Indigo', hex: '#3F46D6', vars: { 50: '240 241 255', 100: '224 226 254', 600: '63 70 214', 700: '50 55 173', 950: '22 23 69' } },
  { name: 'Navy', hex: '#1E3A8A', vars: { 50: '238 242 251', 100: '219 228 247', 600: '30 58 138', 700: '25 47 112', 950: '12 20 46' } },
]

function BrandingSection() {
  const toast = useToast()
  const [preset, setPreset] = useState(0)
  const [saving, setSaving] = useState(false)
  const current = brandPresets[preset]!
  const previewStyle = Object.fromEntries(Object.entries(current.vars).map(([step, value]) => [`--brand-${step}`, value])) as CSSProperties

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Logo" description="PNG or SVG, at least 256 × 256 pixels." divider />
        <CardBody className="flex flex-col items-start gap-5 py-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-ink-300 bg-ink-25 text-ink-400"><Icon icon={MdOutlineUploadFile} size="lg" /></div>
          <div>
            <Button variant="secondary" leadingIcon={MdOutlineUploadFile} onClick={() => toast({ tone: 'info', title: 'Logo upload arrives with the Files module' })}>Upload logo</Button>
            <p className="mt-2 text-small text-ink-500">Appears on invoices, receipts and the client portal.</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Portal color" description="Used for buttons and highlights in your client portal." divider />
        <CardBody className="grid gap-6 py-5 md:grid-cols-[1fr_1.1fr]">
          <div role="radiogroup" aria-label="Portal color" className="grid grid-cols-2 gap-3 self-start">
            {brandPresets.map((option, index) => (
              <button
                key={option.name}
                type="button"
                role="radio"
                aria-checked={preset === index}
                onClick={() => setPreset(index)}
                className={cn('flex items-center gap-3 rounded-lg border p-3 text-left transition-[border-color,box-shadow] duration-fast focus-ring', preset === index ? 'border-brand-600 ring-1 ring-brand-600' : 'border-ink-200 hover:border-ink-300')}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: option.hex }}>{preset === index && <Icon icon={MdCheck} size="sm" />}</span>
                <span className="text-small font-semibold text-ink-800">{option.name}</span>
              </button>
            ))}
          </div>
          <div style={previewStyle} aria-label="Portal preview" className="overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
            <div className="flex items-center gap-2 bg-brand-950 px-4 py-3 text-small font-semibold text-white"><span className="h-5 w-5 rounded-md bg-brand-600" />Mwangaza Studio</div>
            <div className="space-y-3 p-4">
              <div className="rounded-md border border-ink-200 bg-white p-3">
                <p className="text-caption text-ink-500">INV-2026-0048</p>
                <p className="tnum text-subheading text-ink-900">KES 184,005.00</p>
                <div className="mt-3 h-8 rounded-md bg-brand-600 text-center text-small font-semibold leading-8 text-white">Pay with M-Pesa</div>
              </div>
              <div className="h-2 w-2/3 rounded-full bg-brand-100" />
            </div>
          </div>
        </CardBody>
        <div className="flex justify-end border-t border-ink-200 bg-ink-25 px-6 py-3 rounded-b-lg">
          <Button loading={saving} onClick={async () => { setSaving(true); await new Promise((r) => setTimeout(r, 700)); setSaving(false); toast({ title: 'Branding saved', description: `Your portal now uses ${current.name}.` }) }}>Save branding</Button>
        </div>
      </Card>
    </div>
  )
}

function TaxSection() {
  const { data, isPending } = useTaxRates()
  const toast = useToast()
  const [toDelete, setToDelete] = useState<string | null>(null)
  return (
    <Card>
      <CardHeader title="Tax rates" description="Applied per invoice line. VAT is 16% in Kenya." actions={<Button size="sm" variant="secondary" leadingIcon={MdAdd} onClick={() => toast({ tone: 'info', title: 'Adding tax rates arrives with API integration' })}>Add rate</Button>} divider />
      {isPending ? <CardBody><Skeleton className="h-24 w-full" /></CardBody> : (
        <ul className="divide-y divide-ink-200">
          {data?.map((rate) => (
            <li key={rate.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
              <span className="tnum flex h-11 w-14 items-center justify-center rounded-md bg-brand-50 text-subheading font-bold text-brand-700">{rate.percent}%</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-ink-900">{rate.name}{rate.isDefault && <Badge tone="brand">Default</Badge>}</p>
                <p className="text-small text-ink-500">{rate.inclusive ? 'Included in prices' : 'Added on top of prices'}</p>
              </div>
              <Menu trigger={<IconButton icon={MdMoreHoriz} label={`Actions for ${rate.name}`} size="sm" tooltip={false} />}>
                <MenuItem onSelect={() => toast({ title: `${rate.name} is now the default` })} disabled={rate.isDefault}>Make default</MenuItem>
                <MenuSeparator />
                <MenuItem icon={MdDeleteOutline} danger onSelect={() => setToDelete(rate.name)} disabled={rate.isDefault}>Delete rate</MenuItem>
              </Menu>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete}?`}
        description="It won’t be offered on new invoices. Invoices that already use it keep their tax amounts."
        confirmLabel="Delete rate"
        onConfirm={() => { toast({ title: `${toDelete} deleted` }); setToDelete(null) }}
      />
    </Card>
  )
}

function TeamSection() {
  const { data, isPending } = useTeam()
  const toast = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [toRemove, setToRemove] = useState<TeamMember | null>(null)
  return (
    <Card>
      <CardHeader title="Team" description="People who can access this workspace. Roles control what they can see and do." actions={<Button size="sm" leadingIcon={MdOutlineSend} onClick={() => setInviteOpen(true)}>Invite member</Button>} divider />
      {isPending ? <CardBody><Skeleton className="h-40 w-full" /></CardBody> : (
        <ul className="divide-y divide-ink-200">
          {data?.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
              <Avatar name={member.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-ink-900">{member.name}{member.status === 'INVITED' && <StatusBadge status="INVITED" />}</p>
                <p className="truncate text-small text-ink-500">{member.email}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="flex items-center justify-end gap-1.5 text-small font-semibold capitalize text-ink-800"><Icon icon={MdOutlineBadge} size="sm" className="text-ink-400" />{member.role.toLowerCase()}</p>
                <p className="text-caption text-ink-500">{member.status === 'INVITED' ? 'Invite pending' : `Active ${formatRelative(member.lastActiveAt)}`}</p>
              </div>
              {member.role !== 'OWNER' ? (
                <Menu trigger={<IconButton icon={MdMoreHoriz} label={`Actions for ${member.name}`} size="sm" tooltip={false} />}>
                  {member.status === 'INVITED' && <MenuItem icon={MdOutlineSend} onSelect={() => toast({ title: 'Invitation resent', description: member.email })}>Resend invitation</MenuItem>}
                  <MenuItem onSelect={() => toast({ tone: 'info', title: 'Role changes arrive with API integration' })}>Change role</MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={MdDeleteOutline} danger onSelect={() => setToRemove(member)}>Remove from workspace</MenuItem>
                </Menu>
              ) : <span className="w-8" />}
            </li>
          ))}
        </ul>
      )}
      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={`Remove ${toRemove?.name}?`}
        description="They’ll lose access immediately. Their time entries and comments stay in your workspace."
        confirmLabel="Remove member"
        onConfirm={() => { toast({ title: `${toRemove?.name} removed` }); setToRemove(null) }}
      />
    </Card>
  )
}

function InviteMemberModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast()
  const schema = z.object({ email: z.string().trim().email('Enter a valid email address'), role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']) })
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '', role: 'MEMBER' } })
  useEffect(() => { if (open) reset({ email: '', role: 'MEMBER' }) }, [open, reset])
  const role = watch('role')
  const roleHelp = { ADMIN: 'Manages clients, team and settings. Can’t change billing.', MANAGER: 'Runs projects, approves time and sends invoices.', MEMBER: 'Logs time and works on assigned projects only.' }[role]
  const onSubmit = handleSubmit(async (values) => {
    await new Promise((r) => setTimeout(r, 800))
    onOpenChange(false)
    toast({ title: 'Invitation sent', description: `${values.email} has 7 days to accept.` })
  })
  return (
    <Modal open={open} onOpenChange={onOpenChange} dismissible={!isSubmitting} size="sm" title="Invite a team member"
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button><Button type="submit" form="invite-form" loading={isSubmitting}>Send invitation</Button></>}>
      <form id="invite-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Email address" required error={errors.email?.message}><Input type="email" placeholder="name@studio.co.ke" autoFocus {...register('email')} /></Field>
        <Field label="Role" required help={roleHelp}>
          <Select {...register('role')}><option value="MEMBER">Member</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></Select>
        </Field>
      </form>
    </Modal>
  )
}

function BillingSection() {
  const { data: workspace } = useWorkspace()
  const { data: team } = useTeam()
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 bg-brand-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-overline uppercase text-brand-300">Current plan</p>
            <p className="mt-1 text-title text-white">{workspace?.plan.name ?? '—'}</p>
            <p className="mt-1 text-small text-white/70">{formatMoney(4500, 'KES')} per month · renews on 1 November</p>
          </div>
          <Button variant="secondary">Change plan</Button>
        </div>
        <CardBody className="grid gap-6 py-6 sm:grid-cols-3">
          <Usage label="Clients" used={workspace?.plan.clientsUsed ?? 0} limit={null} />
          <Usage label="Team members" used={team?.length ?? 0} limit={10} />
          <Usage label="Storage" used={3.4} limit={20} unit="GB" />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Payment method" description="Your subscription renews by M-Pesa." divider />
        <CardBody className="flex items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-600"><Icon icon={MdOutlineCreditCard} size="md" /></span><div><p className="font-semibold text-ink-900">M-Pesa · +254 712 ••• 678</p><p className="text-small text-ink-500">Prompt sent 3 days before renewal</p></div></div>
          <Button variant="secondary" size="sm">Update</Button>
        </CardBody>
      </Card>
    </div>
  )
}

function Usage({ label, used, limit, unit = '' }: { label: string; used: number; limit: number | null; unit?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between"><p className="text-small font-medium text-ink-600">{label}</p><p className="tnum text-small text-ink-500"><span className="font-semibold text-ink-900">{used}{unit && ` ${unit}`}</span>{limit ? ` of ${limit}${unit && ` ${unit}`}` : ' · unlimited'}</p></div>
      {limit
        ? <ProgressBar className="mt-2" value={used} max={limit} label={`${label} usage`} tone={used / limit > 0.95 ? 'danger' : 'brand'} />
        : <p className="mt-2 text-caption text-ink-500">No limit on your plan</p>}
    </div>
  )
}
