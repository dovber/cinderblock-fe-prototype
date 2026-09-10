import { BriefcaseBusiness, CalendarDays, Clock3, LayoutGrid, Receipt, ScrollText, SquareCheckBig, Store, UserRound } from 'lucide-react'

export const navigation = [
  [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }, { id: 'tasks', label: 'Tasks', icon: SquareCheckBig }, { id: 'calendar', label: 'Calendar', icon: CalendarDays }],
  [{ id: 'jobs', label: 'Jobs', icon: BriefcaseBusiness }, { id: 'estimates', label: 'Estimates', icon: ScrollText }, { id: 'invoices', label: 'Invoices', icon: Receipt }, { id: 'purchase-orders', label: 'Purchase orders', icon: ScrollText }, { id: 'timesheets', label: 'Timesheets', icon: Clock3 }],
  [{ id: 'customers', label: 'Customers', icon: UserRound }, { id: 'vendors', label: 'Vendors', icon: Store }],
] as const

export type WorkspaceSection = typeof navigation[number][number]['id']
export const workspaceLabels = Object.fromEntries(navigation.flat().map(item => [item.id, item.label])) as Record<WorkspaceSection, string>

