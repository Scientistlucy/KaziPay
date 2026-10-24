import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mockApi, type ClientInput } from '../mocks/api'
import type { TaskStatus, Workspace } from '../types'

// Query hooks are the only way screens read data. Swapping mockApi for the Axios client later does not touch components.
export const keys = {
  dashboard: ['dashboard'] as const,
  activity: ['activity'] as const,
  clients: ['clients'] as const,
  client: (id: string) => ['clients', id] as const,
  contacts: (id: string) => ['clients', id, 'contacts'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  tasks: (id: string) => ['projects', id, 'tasks'] as const,
  milestones: (id: string) => ['projects', id, 'milestones'] as const,
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,
  payments: ['payments'] as const,
  timesheet: ['timesheet'] as const,
  team: ['team'] as const,
  taxRates: ['taxRates'] as const,
  workspace: ['workspace'] as const,
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: mockApi.dashboard })
export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: mockApi.activity })
export const useClients = () => useQuery({ queryKey: keys.clients, queryFn: mockApi.clients })
export const useClient = (id: string) => useQuery({ queryKey: keys.client(id), queryFn: () => mockApi.client(id), retry: false })
export const useContacts = (id: string) => useQuery({ queryKey: keys.contacts(id), queryFn: () => mockApi.contacts(id) })
export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: mockApi.projects })
export const useProject = (id: string) => useQuery({ queryKey: keys.project(id), queryFn: () => mockApi.project(id), retry: false })
export const useTasks = (id: string) => useQuery({ queryKey: keys.tasks(id), queryFn: () => mockApi.tasks(id) })
export const useMilestones = (id: string) => useQuery({ queryKey: keys.milestones(id), queryFn: () => mockApi.milestones(id) })
export const useInvoices = () => useQuery({ queryKey: keys.invoices, queryFn: mockApi.invoices })
export const useInvoice = (id: string) => useQuery({ queryKey: keys.invoice(id), queryFn: () => mockApi.invoice(id), retry: false })
export const usePayments = () => useQuery({ queryKey: keys.payments, queryFn: mockApi.payments })
export const useTimesheet = () => useQuery({ queryKey: keys.timesheet, queryFn: mockApi.timesheet })
export const useTeam = () => useQuery({ queryKey: keys.team, queryFn: mockApi.team })
export const useTaxRates = () => useQuery({ queryKey: keys.taxRates, queryFn: mockApi.taxRates })
export const useWorkspace = () => useQuery({ queryKey: keys.workspace, queryFn: mockApi.workspace })

export function useSaveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ClientInput }) => (id ? mockApi.updateClient(id, input) : mockApi.createClient(input)),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: keys.clients })
      queryClient.setQueryData(keys.client(client.id), client)
      queryClient.invalidateQueries({ queryKey: keys.workspace })
    },
  })
}

export function useArchiveClients() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mockApi.archiveClients,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.clients }),
  })
}

export function useRestoreClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: mockApi.restoreClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.clients }),
  })
}

export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => mockApi.moveTask(id, status),
    // Optimistic update: the card lands in its new column immediately (spec section 15).
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: keys.tasks(projectId) })
      const previous = queryClient.getQueryData(keys.tasks(projectId))
      queryClient.setQueryData(keys.tasks(projectId), (tasks: Awaited<ReturnType<typeof mockApi.tasks>> | undefined) =>
        tasks?.map((task) => (task.id === id ? { ...task, status } : task)))
      return { previous }
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(keys.tasks(projectId), context?.previous),
  })
}

export function useInvoiceAction(action: 'send' | 'void') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => (action === 'send' ? mockApi.sendInvoice(id) : mockApi.voidInvoice(id)),
    onSuccess: (invoice) => {
      queryClient.setQueryData(keys.invoice(invoice.id), invoice)
      queryClient.invalidateQueries({ queryKey: keys.invoices })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Workspace>) => mockApi.updateWorkspace(input),
    onSuccess: (workspace) => queryClient.setQueryData(keys.workspace, workspace),
  })
}
