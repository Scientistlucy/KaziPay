// Domain shapes mirror the backend DTOs where they exist (clients) and the spec elsewhere.

export type ClientStatus = 'ACTIVE' | 'ARCHIVED'

export type Client = {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  billingEmail?: string
  address?: string
  country?: string
  taxId?: string
  defaultCurrency: string
  paymentTermsDays: number
  notes?: string
  status: ClientStatus
  // Read-model fields the API will add for list and detail screens.
  industry: string
  outstanding: number
  totalBilled: number
  activeProjects: number
  lastActivityAt: string
  createdAt: string
  portalAccess: boolean
}

export type Contact = { id: string; clientId: string; name: string; email?: string; phone?: string; roleTitle?: string; primary: boolean }

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'AT_RISK'
export type BillingType = 'FIXED_PRICE' | 'TIME_AND_MATERIALS' | 'RETAINER' | 'MILESTONE'

export type Project = {
  id: string
  name: string
  clientId: string
  clientName: string
  status: ProjectStatus
  billingType: BillingType
  budget: number
  spent: number
  progress: number
  startDate: string
  dueDate: string
  team: string[]
  openTasks: number
  hoursLogged: number
  description: string
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Task = {
  id: string
  projectId: string
  title: string
  status: TaskStatus
  priority: Priority
  assignee: string
  dueDate?: string
  comments: number
  checklist?: { done: number; total: number }
  clientVisible: boolean
}

export type Milestone = { id: string; projectId: string; title: string; dueDate: string; status: 'COMPLETED' | 'IN_PROGRESS' | 'TODO'; amount: number; description: string }

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID'

export type InvoiceItem = { description: string; quantity: number; unitPrice: number; taxRate: number }

export type Invoice = {
  id: string
  number: string
  clientId: string
  clientName: string
  projectName?: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  currency: string
  items: InvoiceItem[]
  amountPaid: number
  notes?: string
}

export type PaymentMethod = 'MPESA' | 'BANK_TRANSFER' | 'CASH' | 'CARD'

export type Payment = {
  id: string
  invoiceId: string
  invoiceNumber: string
  clientName: string
  method: PaymentMethod
  amount: number
  currency: string
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED'
  reference: string
  paidAt: string
  phone?: string
}

export type ActivityKind = 'payment' | 'invoice' | 'client' | 'project' | 'time' | 'task'
export type Activity = { id: string; kind: ActivityKind; actor: string; text: string; target: string; at: string; amount?: number }

export type TimesheetRow = { projectId: string; projectName: string; clientName: string; billable: boolean; hours: number[] }

export type TeamMember = { id: string; name: string; email: string; role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'; status: 'ACTIVE' | 'INVITED'; rate: number; lastActiveAt: string }

export type TaxRate = { id: string; name: string; percent: number; inclusive: boolean; isDefault: boolean }

export type Workspace = {
  name: string
  slug: string
  businessEmail: string
  businessPhone: string
  address: string
  taxId: string
  defaultCurrency: string
  timezone: string
  invoicePrefix: string
  defaultTermsDays: number
  primaryColor: string
  plan: { name: string; clientsUsed: number; clientsLimit: number }
}

export type DashboardSummary = {
  outstanding: number
  outstandingDelta: number
  overdue: number
  overdueCount: number
  collectedThisMonth: number
  collectedDelta: number
  hoursThisWeek: number
  billableShare: number
  revenue: { month: string; collected: number }[]
  aging: { bucket: string; amount: number; overdue: boolean }[]
  attention: { id: string; kind: 'overdue' | 'approval' | 'due'; title: string; detail: string; amount?: number; href: string }[]
}
