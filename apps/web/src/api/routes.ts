import { get, post, patch, del } from './client';
import type {
  AuthResponse,
  UserPublic,
  Group,
  Expense,
  CreateExpenseBody,
  Balance,
  SettlementSuggestion,
  Settlement,
  LedgerEntry,
  RecurringTemplate,
  MonthlySpend,
} from '@roomsplit/types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    post<AuthResponse>('/auth/login', data),

  logout: () =>
    post<{ message: string }>('/auth/logout'),

  refresh: () =>
    post<{ accessToken: string }>('/auth/refresh'),

  me: () =>
    get<UserPublic>('/auth/me'),

  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    patch<UserPublic>('/auth/me', data),
};

// ─── Groups ───────────────────────────────────────────────────────────────────

export const groupsApi = {
  create: (name: string) =>
    post<Group>('/groups', { name }),

  list: () =>
    get<Group[]>('/groups'),

  get: (groupId: string) =>
    get<Group>(`/groups/${groupId}`),

  update: (groupId: string, data: { name?: string }) =>
    patch<Group>(`/groups/${groupId}`, data),

  delete: (groupId: string) =>
    del<{ message: string }>(`/groups/${groupId}`),

  join: (inviteCode: string) =>
    post<Group>(`/groups/join/${inviteCode}`),

  regenerateInvite: (groupId: string) =>
    post<{ inviteCode: string }>(`/groups/${groupId}/invite/regenerate`),

  removeMember: (groupId: string, userId: string) =>
    del<{ message: string }>(`/groups/${groupId}/members/${userId}`),

  promoteMember: (groupId: string, userId: string) =>
    patch<{ message: string }>(`/groups/${groupId}/members/${userId}/promote`),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpenseListParams {
  category?: string;
  from?:     string;
  to?:       string;
  cursor?:   string;
  limit?:    number;
}

export const expensesApi = {
  create: (groupId: string, data: CreateExpenseBody) =>
    post<Expense>(`/groups/${groupId}/expenses`, data),

  list: (groupId: string, params?: ExpenseListParams) =>
    get<{ items: Expense[]; nextCursor: string | null }>(`/groups/${groupId}/expenses`, params as any),

  get: (groupId: string, expenseId: string) =>
    get<Expense>(`/groups/${groupId}/expenses/${expenseId}`),

  update: (groupId: string, expenseId: string, data: Partial<CreateExpenseBody>) =>
    patch<Expense>(`/groups/${groupId}/expenses/${expenseId}`, data),

  delete: (groupId: string, expenseId: string) =>
    del<{ message: string }>(`/groups/${groupId}/expenses/${expenseId}`),
};

// ─── Balances ─────────────────────────────────────────────────────────────────

export const balancesApi = {
  get: (groupId: string) =>
    get<Balance[]>(`/groups/${groupId}/balances`),

  optimized: (groupId: string) =>
    get<SettlementSuggestion[]>(`/groups/${groupId}/balances/optimized`),

  ledger: (groupId: string, cursor?: string, limit?: number) =>
    get<{ items: LedgerEntry[]; nextCursor: string | null }>(
      `/groups/${groupId}/balances/ledger`,
      { cursor, limit }
    ),

  createSettlement: (groupId: string, data: { payeeId: string; amount: number }) =>
    post<Settlement>(`/groups/${groupId}/balances/settlements`, data),

  listSettlements: (groupId: string) =>
    get<Settlement[]>(`/groups/${groupId}/balances/settlements`),

  analytics: (groupId: string, months?: number) =>
    get<MonthlySpend[]>(`/groups/${groupId}/balances/analytics`, { months }),
};

// ─── Recurring ────────────────────────────────────────────────────────────────

export const recurringApi = {
  list: (groupId: string) =>
    get<RecurringTemplate[]>(`/groups/${groupId}/recurring`),

  create: (groupId: string, data: {
    description: string;
    amount:      number;
    category:    string;
    splitType:   string;
    frequency:   string;
    nextRunDate: string;
  }) =>
    post<RecurringTemplate>(`/groups/${groupId}/recurring`, data),

  update: (groupId: string, templateId: string, data: Partial<{
    description: string;
    amount:      number;
    category:    string;
    splitType:   string;
    frequency:   string;
    nextRunDate: string;
    isActive:    boolean;
  }>) =>
    patch<RecurringTemplate>(`/groups/${groupId}/recurring/${templateId}`, data),

  delete: (groupId: string, templateId: string) =>
    del<{ message: string }>(`/groups/${groupId}/recurring/${templateId}`),
};
