import type {
  Activity, Client, Contact, DashboardSummary, Invoice, Milestone, Payment, Project, Task, TaxRate, TeamMember, TimesheetRow, Workspace,
} from '../types'

// Fictional sample data for building the UI before API integration. Dates are relative to today so the screens stay realistic.
const DAY = 86_400_000
const now = Date.now()
const offset = (days: number, hours = 0) => new Date(now + days * DAY + hours * 3_600_000).toISOString()

export const currentUser = { name: 'Amina Odhiambo', email: 'amina@mwangaza.studio', role: 'OWNER' as const }

export const workspace: Workspace = {
  name: 'Mwangaza Studio',
  slug: 'mwangaza',
  businessEmail: 'hello@mwangaza.studio',
  businessPhone: '+254 712 345 678',
  address: 'Riverside Drive, Nairobi',
  taxId: 'P051234567X',
  defaultCurrency: 'KES',
  timezone: 'Africa/Nairobi',
  invoicePrefix: 'INV',
  defaultTermsDays: 14,
  primaryColor: '#1F51E0',
  plan: { name: 'Professional', clientsUsed: 14, clientsLimit: -1 },
}

const clientSeed: [string, string, string, string, number, number, number, number, Client['status']][] = [
  // name, industry, contact email, phone, outstanding, billed, active projects, last activity (days ago), status
  ['Savanna Logistics Ltd', 'Logistics', 'finance@savannalogistics.co.ke', '+254 722 410 220', 184_000, 1_240_000, 2, 0, 'ACTIVE'],
  ['Pwani Fresh Foods', 'Food & beverage', 'accounts@pwanifresh.co.ke', '+254 733 118 905', 96_500, 612_000, 1, 1, 'ACTIVE'],
  ['Kilele Ventures', 'Investment', 'ops@kilele.vc', '+254 701 662 341', 0, 880_000, 1, 2, 'ACTIVE'],
  ['Baraka Health Clinics', 'Healthcare', 'admin@barakahealth.co.ke', '+254 720 553 017', 312_000, 1_965_000, 2, 3, 'ACTIVE'],
  ['Upendo Schools Trust', 'Education', 'bursar@upendoschools.org', '+254 711 902 664', 45_000, 390_000, 1, 5, 'ACTIVE'],
  ['Nuru Solar Co.', 'Energy', 'billing@nurusolar.africa', '+254 745 210 889', 0, 455_000, 0, 9, 'ACTIVE'],
  ['Tausi Apparel', 'Retail', 'hello@tausiapparel.com', '+254 798 334 120', 128_000, 520_000, 1, 4, 'ACTIVE'],
  ['Mto Water Services', 'Utilities', 'procurement@mtowater.co.ke', '+254 727 645 301', 0, 260_000, 0, 21, 'ACTIVE'],
  ['Kijani Agritech', 'Agriculture', 'team@kijani.farm', '+254 790 118 447', 74_000, 300_000, 1, 6, 'ACTIVE'],
  ['Bahari Hotels Group', 'Hospitality', 'finance@baharihotels.co.ke', '+254 722 990 115', 0, 1_120_000, 0, 33, 'ACTIVE'],
  ['Simba Fintech', 'Financial services', 'ap@simbafintech.io', '+254 709 551 230', 210_000, 740_000, 1, 2, 'ACTIVE'],
  ['Jua Kali Makers Hub', 'Manufacturing', 'info@juakalihub.org', '+254 712 004 778', 0, 95_000, 0, 48, 'ARCHIVED'],
  ['Mlima Coffee Estates', 'Agriculture', 'exports@mlimacoffee.co.ke', '+254 734 220 916', 52_000, 410_000, 1, 7, 'ACTIVE'],
  ['Zawadi Events', 'Events', 'plan@zawadievents.co.ke', '+254 768 401 552', 0, 140_000, 0, 62, 'ARCHIVED'],
]

export const clients: Client[] = clientSeed.map(([name, industry, email, phone, outstanding, billed, activeProjects, lastDays, status], index) => ({
  id: `cl_${(index + 1).toString().padStart(3, '0')}`,
  name,
  company: name,
  email,
  phone,
  billingEmail: email,
  address: ['Westlands, Nairobi', 'Nyali, Mombasa', 'Milimani, Kisumu', 'Kilimani, Nairobi', 'Section 58, Nakuru'][index % 5],
  country: 'Kenya',
  taxId: `P05${(1_000_000 + index * 73_421).toString().slice(0, 7)}${'ABCDEFGHJK'[index % 10]}`,
  defaultCurrency: index === 2 ? 'USD' : 'KES',
  paymentTermsDays: index % 3 === 0 ? 30 : 14,
  notes: index === 0 ? 'Prefers invoices on the 1st. PO number required on every invoice.' : undefined,
  status,
  industry,
  outstanding,
  totalBilled: billed,
  activeProjects,
  lastActivityAt: offset(-lastDays, -index),
  createdAt: offset(-120 - index * 17),
  portalAccess: index % 4 !== 3,
}))

export const contacts: Contact[] = [
  { id: 'ct_1', clientId: 'cl_001', name: 'Wanjiru Kamau', email: 'wanjiru@savannalogistics.co.ke', phone: '+254 722 410 221', roleTitle: 'Finance Director', primary: true },
  { id: 'ct_2', clientId: 'cl_001', name: 'Otieno Ouma', email: 'otieno@savannalogistics.co.ke', phone: '+254 722 410 222', roleTitle: 'Operations Lead', primary: false },
  { id: 'ct_3', clientId: 'cl_001', name: 'Achieng Njeri', email: 'achieng@savannalogistics.co.ke', roleTitle: 'Procurement', primary: false },
  { id: 'ct_4', clientId: 'cl_004', name: 'Dr. Mutua Kioko', email: 'mutua@barakahealth.co.ke', roleTitle: 'Medical Director', primary: true },
  { id: 'ct_5', clientId: 'cl_002', name: 'Fatuma Said', email: 'fatuma@pwanifresh.co.ke', roleTitle: 'CEO', primary: true },
]

export const team: TeamMember[] = [
  { id: 'tm_1', name: 'Amina Odhiambo', email: 'amina@mwangaza.studio', role: 'OWNER', status: 'ACTIVE', rate: 6500, lastActiveAt: offset(0, -1) },
  { id: 'tm_2', name: 'Brian Mwangi', email: 'brian@mwangaza.studio', role: 'MANAGER', status: 'ACTIVE', rate: 5000, lastActiveAt: offset(0, -3) },
  { id: 'tm_3', name: 'Grace Wambui', email: 'grace@mwangaza.studio', role: 'MEMBER', status: 'ACTIVE', rate: 4000, lastActiveAt: offset(-1) },
  { id: 'tm_4', name: 'Kevin Otieno', email: 'kevin@mwangaza.studio', role: 'MEMBER', status: 'ACTIVE', rate: 3500, lastActiveAt: offset(-2) },
  { id: 'tm_5', name: 'Lilian Chebet', email: 'lilian@mwangaza.studio', role: 'ADMIN', status: 'INVITED', rate: 4500, lastActiveAt: offset(-4) },
]

export const projects: Project[] = [
  { id: 'pr_1', name: 'Fleet tracking dashboard', clientId: 'cl_001', clientName: 'Savanna Logistics Ltd', status: 'ACTIVE', billingType: 'TIME_AND_MATERIALS', budget: 850_000, spent: 512_000, progress: 62, startDate: offset(-54), dueDate: offset(26), team: ['Amina Odhiambo', 'Brian Mwangi', 'Kevin Otieno'], openTasks: 9, hoursLogged: 124, description: 'Real-time fleet visibility for dispatch and finance teams, with route cost reporting.' },
  { id: 'pr_2', name: 'Patient booking portal', clientId: 'cl_004', clientName: 'Baraka Health Clinics', status: 'AT_RISK', billingType: 'MILESTONE', budget: 1_200_000, spent: 1_010_000, progress: 71, startDate: offset(-90), dueDate: offset(5), team: ['Amina Odhiambo', 'Grace Wambui'], openTasks: 14, hoursLogged: 236, description: 'Online booking and M-Pesa deposits across six clinics.' },
  { id: 'pr_3', name: 'Brand refresh', clientId: 'cl_007', clientName: 'Tausi Apparel', status: 'ACTIVE', billingType: 'FIXED_PRICE', budget: 380_000, spent: 140_000, progress: 38, startDate: offset(-20), dueDate: offset(40), team: ['Grace Wambui'], openTasks: 6, hoursLogged: 41, description: 'Identity, packaging and lookbook for the 2027 collection.' },
  { id: 'pr_4', name: 'Supplier onboarding app', clientId: 'cl_002', clientName: 'Pwani Fresh Foods', status: 'ACTIVE', billingType: 'TIME_AND_MATERIALS', budget: 540_000, spent: 210_000, progress: 45, startDate: offset(-35), dueDate: offset(48), team: ['Brian Mwangi', 'Kevin Otieno'], openTasks: 11, hoursLogged: 66, description: 'Mobile-first onboarding and compliance checks for farm suppliers.' },
  { id: 'pr_5', name: 'Investor reporting retainer', clientId: 'cl_003', clientName: 'Kilele Ventures', status: 'ACTIVE', billingType: 'RETAINER', budget: 240_000, spent: 160_000, progress: 66, startDate: offset(-60), dueDate: offset(30), team: ['Amina Odhiambo'], openTasks: 3, hoursLogged: 38, description: 'Monthly portfolio reports and LP updates.' },
  { id: 'pr_6', name: 'Lending API integration', clientId: 'cl_011', clientName: 'Simba Fintech', status: 'ON_HOLD', billingType: 'TIME_AND_MATERIALS', budget: 600_000, spent: 228_000, progress: 30, startDate: offset(-40), dueDate: offset(55), team: ['Kevin Otieno', 'Brian Mwangi'], openTasks: 8, hoursLogged: 57, description: 'Credit scoring and disbursement integration, paused pending regulator feedback.' },
  { id: 'pr_7', name: 'Learning platform pilot', clientId: 'cl_005', clientName: 'Upendo Schools Trust', status: 'ACTIVE', billingType: 'MILESTONE', budget: 300_000, spent: 90_000, progress: 24, startDate: offset(-14), dueDate: offset(70), team: ['Grace Wambui', 'Kevin Otieno'], openTasks: 12, hoursLogged: 22, description: 'Offline-first lessons for three pilot schools.' },
  { id: 'pr_8', name: 'Export traceability', clientId: 'cl_013', clientName: 'Mlima Coffee Estates', status: 'ACTIVE', billingType: 'FIXED_PRICE', budget: 420_000, spent: 188_000, progress: 52, startDate: offset(-30), dueDate: offset(21), team: ['Brian Mwangi'], openTasks: 5, hoursLogged: 49, description: 'Lot-level traceability from farm to port.' },
  { id: 'pr_9', name: 'Website rebuild', clientId: 'cl_006', clientName: 'Nuru Solar Co.', status: 'COMPLETED', billingType: 'FIXED_PRICE', budget: 260_000, spent: 248_000, progress: 100, startDate: offset(-110), dueDate: offset(-12), team: ['Grace Wambui', 'Amina Odhiambo'], openTasks: 0, hoursLogged: 88, description: 'Marketing site with installer finder.' },
]

const taskSeed: [string, Task['status'], Task['priority'], string, number | null, number, [number, number] | null, boolean][] = [
  ['Route cost report: export to Excel', 'TODO', 'MEDIUM', 'Kevin Otieno', 6, 2, null, true],
  ['Driver app offline sync', 'TODO', 'HIGH', 'Brian Mwangi', 9, 0, [0, 4], false],
  ['Fuel card reconciliation import', 'TODO', 'LOW', 'Kevin Otieno', 14, 1, null, false],
  ['Live map clustering for 400+ vehicles', 'IN_PROGRESS', 'URGENT', 'Brian Mwangi', 2, 5, [3, 5], true],
  ['Dispatch board filters', 'IN_PROGRESS', 'MEDIUM', 'Amina Odhiambo', 4, 3, null, true],
  ['Geofence alerts by SMS', 'IN_PROGRESS', 'HIGH', 'Kevin Otieno', 7, 1, [1, 3], false],
  ['Finance dashboard: cost per km', 'REVIEW', 'HIGH', 'Amina Odhiambo', 1, 4, [4, 4], true],
  ['Role-based access for depot managers', 'REVIEW', 'MEDIUM', 'Brian Mwangi', 3, 2, null, false],
  ['Vehicle import from CSV', 'DONE', 'MEDIUM', 'Kevin Otieno', null, 3, [5, 5], true],
  ['Authentication and SSO', 'DONE', 'HIGH', 'Brian Mwangi', null, 6, null, false],
  ['Design system handoff', 'DONE', 'LOW', 'Amina Odhiambo', null, 1, null, true],
]

export const tasks: Task[] = taskSeed.map(([title, status, priority, assignee, due, comments, checklist, clientVisible], index) => ({
  id: `tk_${index + 1}`,
  projectId: 'pr_1',
  title,
  status,
  priority,
  assignee,
  dueDate: due === null ? undefined : offset(due),
  comments,
  checklist: checklist ? { done: checklist[0], total: checklist[1] } : undefined,
  clientVisible,
}))

export const milestones: Milestone[] = [
  { id: 'ms_1', projectId: 'pr_1', title: 'Discovery and data audit', dueDate: offset(-40), status: 'COMPLETED', amount: 120_000, description: 'Telematics vendors reviewed, data model signed off.' },
  { id: 'ms_2', projectId: 'pr_1', title: 'Live map and dispatch board', dueDate: offset(-6), status: 'COMPLETED', amount: 260_000, description: 'Real-time positions, status filters and driver assignment.' },
  { id: 'ms_3', projectId: 'pr_1', title: 'Finance reporting', dueDate: offset(9), status: 'IN_PROGRESS', amount: 220_000, description: 'Cost per km, fuel reconciliation and monthly exports.' },
  { id: 'ms_4', projectId: 'pr_1', title: 'Rollout and training', dueDate: offset(26), status: 'TODO', amount: 150_000, description: 'Depot rollout, training sessions and handover documentation.' },
]

const invoiceSeed: [string, string, string | undefined, number, number, Invoice['status'], number, number, string][] = [
  // number suffix, clientId, project, issued (days ago), terms, status, subtotal, paid, currency
  ['0048', 'cl_001', 'Fleet tracking dashboard', 3, 30, 'SENT', 158_620, 0, 'KES'],
  ['0047', 'cl_004', 'Patient booking portal', 6, 14, 'VIEWED', 268_965, 0, 'KES'],
  ['0046', 'cl_011', 'Lending API integration', 9, 14, 'PARTIALLY_PAID', 181_034, 100_000, 'KES'],
  ['0045', 'cl_002', 'Supplier onboarding app', 19, 14, 'OVERDUE', 83_189, 0, 'KES'],
  ['0044', 'cl_007', 'Brand refresh', 21, 14, 'OVERDUE', 110_345, 0, 'KES'],
  ['0043', 'cl_003', 'Investor reporting retainer', 24, 14, 'PAID', 1_724, 2_000, 'USD'],
  ['0042', 'cl_009', undefined, 27, 14, 'OVERDUE', 63_793, 0, 'KES'],
  ['0041', 'cl_004', 'Patient booking portal', 32, 14, 'PAID', 215_517, 250_000, 'KES'],
  ['0040', 'cl_013', 'Export traceability', 35, 30, 'PARTIALLY_PAID', 103_448, 68_000, 'KES'],
  ['0039', 'cl_005', 'Learning platform pilot', 38, 14, 'OVERDUE', 38_793, 0, 'KES'],
  ['0038', 'cl_001', 'Fleet tracking dashboard', 41, 30, 'PAID', 224_138, 260_000, 'KES'],
  ['0037', 'cl_006', 'Website rebuild', 45, 14, 'PAID', 103_448, 120_000, 'KES'],
  ['0036', 'cl_010', undefined, 52, 14, 'PAID', 172_414, 200_000, 'KES'],
  ['0049', 'cl_001', 'Fleet tracking dashboard', 0, 30, 'DRAFT', 74_138, 0, 'KES'],
]

export const invoices: Invoice[] = invoiceSeed.map(([suffix, clientId, projectName, issuedAgo, terms, status, seedSubtotal, paid, currency]) => {
  const client = clients.find((c) => c.id === clientId)!
  // Whole-number line items, and a subtotal divisible by 25 so 16% VAT gives a whole-shilling total.
  const subtotal = Math.round(seedSubtotal / 25) * 25
  const hours = Math.max(1, Math.round((subtotal * 0.6) / 5000))
  const rate = currency === 'USD' ? 40 : 5000
  const engineering = Math.min(hours * rate, subtotal)
  return {
    id: `in_${suffix}`,
    number: `INV-2026-${suffix}`,
    clientId,
    clientName: client.name,
    projectName,
    issueDate: offset(-issuedAgo),
    dueDate: offset(-issuedAgo + terms),
    status,
    currency,
    items: [
      { description: projectName ? `${projectName}: engineering` : 'Consulting services', quantity: engineering / rate, unitPrice: rate, taxRate: 16 },
      { description: projectName ? `${projectName}: design and QA` : 'Workshop facilitation', quantity: 1, unitPrice: subtotal - engineering, taxRate: 16 },
    ],
    amountPaid: paid,
    notes: 'Pay via M-Pesa Paybill 400200, account number is the invoice number. Thank you for your business.',
  }
})

export const payments: Payment[] = [
  { id: 'py_1', invoiceId: 'in_0046', invoiceNumber: 'INV-2026-0046', clientName: 'Simba Fintech', method: 'MPESA', amount: 100_000, currency: 'KES', status: 'SUCCEEDED', reference: 'SJK4H7Q2LM', paidAt: offset(-1, -2), phone: '+254 709 ••• 230' },
  { id: 'py_2', invoiceId: 'in_0043', invoiceNumber: 'INV-2026-0043', clientName: 'Kilele Ventures', method: 'BANK_TRANSFER', amount: 2_000, currency: 'USD', status: 'SUCCEEDED', reference: 'FT26291KXB04', paidAt: offset(-4) },
  { id: 'py_3', invoiceId: 'in_0040', invoiceNumber: 'INV-2026-0040', clientName: 'Mlima Coffee Estates', method: 'MPESA', amount: 68_000, currency: 'KES', status: 'SUCCEEDED', reference: 'SJ94KD2MQA', paidAt: offset(-6, -5), phone: '+254 734 ••• 916' },
  { id: 'py_4', invoiceId: 'in_0045', invoiceNumber: 'INV-2026-0045', clientName: 'Pwani Fresh Foods', method: 'MPESA', amount: 96_500, currency: 'KES', status: 'FAILED', reference: 'Cancelled by user', paidAt: offset(-7, -1), phone: '+254 733 ••• 905' },
  { id: 'py_5', invoiceId: 'in_0041', invoiceNumber: 'INV-2026-0041', clientName: 'Baraka Health Clinics', method: 'MPESA', amount: 250_000, currency: 'KES', status: 'SUCCEEDED', reference: 'SIX81LPQ3T', paidAt: offset(-12) },
  { id: 'py_6', invoiceId: 'in_0038', invoiceNumber: 'INV-2026-0038', clientName: 'Savanna Logistics Ltd', method: 'BANK_TRANSFER', amount: 260_000, currency: 'KES', status: 'SUCCEEDED', reference: 'RTGS-0099812', paidAt: offset(-16) },
  { id: 'py_7', invoiceId: 'in_0037', invoiceNumber: 'INV-2026-0037', clientName: 'Nuru Solar Co.', method: 'CASH', amount: 120_000, currency: 'KES', status: 'SUCCEEDED', reference: 'Receipt 0412', paidAt: offset(-24) },
  { id: 'py_8', invoiceId: 'in_0036', invoiceNumber: 'INV-2026-0036', clientName: 'Bahari Hotels Group', method: 'MPESA', amount: 200_000, currency: 'KES', status: 'SUCCEEDED', reference: 'SIL20XQ8NV', paidAt: offset(-33) },
  { id: 'py_9', invoiceId: 'in_0047', invoiceNumber: 'INV-2026-0047', clientName: 'Baraka Health Clinics', method: 'MPESA', amount: 312_000, currency: 'KES', status: 'PENDING', reference: 'Awaiting PIN', paidAt: offset(0, -0.2), phone: '+254 720 ••• 017' },
]

export const activity: Activity[] = [
  { id: 'ac_1', kind: 'payment', actor: 'Simba Fintech', text: 'paid', target: 'INV-2026-0046', at: offset(-1, -2), amount: 100_000 },
  { id: 'ac_2', kind: 'invoice', actor: 'Baraka Health Clinics', text: 'viewed', target: 'INV-2026-0047', at: offset(-1, -6) },
  { id: 'ac_3', kind: 'task', actor: 'Brian Mwangi', text: 'moved to review', target: 'Role-based access for depot managers', at: offset(-1, -9) },
  { id: 'ac_4', kind: 'invoice', actor: 'Amina Odhiambo', text: 'sent', target: 'INV-2026-0048', at: offset(-3) },
  { id: 'ac_5', kind: 'time', actor: 'Grace Wambui', text: 'submitted 38h for approval', target: 'Week 43', at: offset(-3, -4) },
  { id: 'ac_6', kind: 'client', actor: 'Amina Odhiambo', text: 'added client', target: 'Mlima Coffee Estates', at: offset(-5) },
  { id: 'ac_7', kind: 'project', actor: 'Brian Mwangi', text: 'completed milestone', target: 'Live map and dispatch board', at: offset(-6) },
]

export const dashboard: DashboardSummary = {
  outstanding: 1_101_500,
  outstandingDelta: -8.4,
  overdue: 371_000,
  overdueCount: 4,
  collectedThisMonth: 486_000,
  collectedDelta: 12.6,
  hoursThisWeek: 31.5,
  billableShare: 84,
  revenue: [
    ['Nov', 412_000], ['Dec', 356_000], ['Jan', 298_000], ['Feb', 445_000], ['Mar', 520_000], ['Apr', 488_000],
    ['May', 610_000], ['Jun', 575_000], ['Jul', 642_000], ['Aug', 598_000], ['Sep', 705_000], ['Oct', 486_000],
  ].map(([month, collected]) => ({ month: month as string, collected: collected as number })),
  aging: [
    { bucket: 'Current', amount: 730_500, overdue: false },
    { bucket: '1–30 days', amount: 193_500, overdue: true },
    { bucket: '31–60 days', amount: 132_000, overdue: true },
    { bucket: '60+ days', amount: 45_500, overdue: true },
  ],
  attention: [
    { id: 'at_1', kind: 'overdue', title: 'INV-2026-0044 is 7 days overdue', detail: 'Tausi Apparel', amount: 128_000, href: '/invoices/in_0044' },
    { id: 'at_2', kind: 'approval', title: '38 hours waiting for approval', detail: 'Grace Wambui · Week 43', href: '/time' },
    { id: 'at_3', kind: 'due', title: 'Patient booking portal due in 5 days', detail: 'Baraka Health Clinics · 71% complete', href: '/projects/pr_2' },
    { id: 'at_4', kind: 'overdue', title: 'INV-2026-0045 is 5 days overdue', detail: 'Pwani Fresh Foods', amount: 96_500, href: '/invoices/in_0045' },
  ],
}

export const timesheet: TimesheetRow[] = [
  { projectId: 'pr_1', projectName: 'Fleet tracking dashboard', clientName: 'Savanna Logistics Ltd', billable: true, hours: [3.5, 4, 2.5, 3, 0, 0, 0] },
  { projectId: 'pr_2', projectName: 'Patient booking portal', clientName: 'Baraka Health Clinics', billable: true, hours: [2, 2.5, 3, 1.5, 0, 0, 0] },
  { projectId: 'pr_5', projectName: 'Investor reporting retainer', clientName: 'Kilele Ventures', billable: true, hours: [1, 0, 1.5, 1, 0, 0, 0] },
  { projectId: 'internal', projectName: 'Internal: sales and admin', clientName: 'Mwangaza Studio', billable: false, hours: [1, 1, 0.5, 2.5, 0, 0, 0] },
]

export const taxRates: TaxRate[] = [
  { id: 'tx_1', name: 'VAT', percent: 16, inclusive: false, isDefault: true },
  { id: 'tx_2', name: 'Withholding tax', percent: 5, inclusive: false, isDefault: false },
  { id: 'tx_3', name: 'Zero rated', percent: 0, inclusive: false, isDefault: false },
]
