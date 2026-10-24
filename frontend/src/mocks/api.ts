import type { Client, Task, TaskStatus, Workspace } from '../types'
import * as db from './data'

// Stand-in for the Axios client until API integration. Each call waits like a network request so loading states are exercised.
const latency = () => new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 450))

async function respond<T>(value: T): Promise<T> {
  await latency()
  return structuredClone(value)
}

export class NotFoundError extends Error {}

export type ClientInput = Pick<Client, 'name' | 'email' | 'phone' | 'billingEmail' | 'address' | 'country' | 'taxId' | 'defaultCurrency' | 'paymentTermsDays' | 'notes' | 'industry'> & { company?: string }

export const mockApi = {
  dashboard: () => respond(db.dashboard),
  activity: () => respond(db.activity),

  clients: () => respond(db.clients),
  client: async (id: string) => {
    const client = db.clients.find((c) => c.id === id)
    if (!client) { await latency(); throw new NotFoundError('Client not found') }
    return respond(client)
  },
  contacts: (clientId: string) => respond(db.contacts.filter((c) => c.clientId === clientId)),
  createClient: async (input: ClientInput) => {
    const client: Client = {
      ...input,
      id: `cl_${Date.now()}`,
      company: input.company || input.name,
      status: 'ACTIVE',
      outstanding: 0,
      totalBilled: 0,
      activeProjects: 0,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      portalAccess: false,
    }
    db.clients.unshift(client)
    db.workspace.plan.clientsUsed += 1
    return respond(client)
  },
  updateClient: async (id: string, input: ClientInput) => {
    const client = db.clients.find((c) => c.id === id)
    if (!client) throw new NotFoundError('Client not found')
    Object.assign(client, input)
    return respond(client)
  },
  archiveClients: async (ids: string[]) => {
    db.clients.forEach((client) => { if (ids.includes(client.id)) client.status = 'ARCHIVED' })
    return respond({ archived: ids.length })
  },
  restoreClient: async (id: string) => {
    const client = db.clients.find((c) => c.id === id)
    if (client) client.status = 'ACTIVE'
    return respond(client)
  },

  projects: () => respond(db.projects),
  project: async (id: string) => {
    const project = db.projects.find((p) => p.id === id)
    if (!project) { await latency(); throw new NotFoundError('Project not found') }
    return respond(project)
  },
  // Every project shows the sample board until tasks come from the API.
  tasks: (projectId: string) => respond(db.tasks.map((task) => ({ ...task, projectId }))),
  moveTask: async (id: string, status: TaskStatus) => {
    const task = db.tasks.find((t) => t.id === id) as Task
    task.status = status
    return respond(task)
  },
  milestones: (projectId: string) => respond(db.milestones.map((m) => ({ ...m, projectId }))),

  invoices: () => respond(db.invoices),
  invoice: async (id: string) => {
    const invoice = db.invoices.find((i) => i.id === id)
    if (!invoice) { await latency(); throw new NotFoundError('Invoice not found') }
    return respond(invoice)
  },
  sendInvoice: async (id: string) => {
    const invoice = db.invoices.find((i) => i.id === id)!
    invoice.status = 'SENT'
    return respond(invoice)
  },
  voidInvoice: async (id: string) => {
    const invoice = db.invoices.find((i) => i.id === id)!
    invoice.status = 'VOID'
    return respond(invoice)
  },

  payments: () => respond(db.payments),
  timesheet: () => respond(db.timesheet),
  team: () => respond(db.team),
  taxRates: () => respond(db.taxRates),
  workspace: () => respond(db.workspace),
  updateWorkspace: async (input: Partial<Workspace>) => {
    Object.assign(db.workspace, input)
    return respond(db.workspace)
  },
}
