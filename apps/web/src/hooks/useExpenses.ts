import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { expensesApi, balancesApi, recurringApi, type ExpenseListParams } from '@/api/routes';
import { getErrorMessage } from '@/lib/utils';
import type { CreateExpenseBody } from '@roomsplit/types';

// ─── Expense keys ──────────────────────────────────────────────────────────────
export const expenseKeys = {
  list:   (groupId: string, params?: ExpenseListParams) => ['expenses', groupId, params] as const,
  detail: (groupId: string, id: string) => ['expenses', groupId, id] as const,
};

// ─── Expenses ─────────────────────────────────────────────────────────────────
export function useExpenses(groupId: string, params?: Omit<ExpenseListParams, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: expenseKeys.list(groupId, params),
    queryFn:  ({ pageParam }) =>
      expensesApi.list(groupId, { ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function useCreateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseBody) => expensesApi.create(groupId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Expense added!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateExpense(groupId: string, expenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateExpenseBody>) => expensesApi.update(groupId, expenseId, data),
    onSuccess: (expense) => {
      qc.setQueryData(expenseKeys.detail(groupId, expenseId), expense);
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Expense updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => expensesApi.delete(groupId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Expense deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// ─── Balances ─────────────────────────────────────────────────────────────────
export const balanceKeys = {
  balances:    (groupId: string) => ['balances', groupId] as const,
  optimized:   (groupId: string) => ['balances', groupId, 'optimized'] as const,
  ledger:      (groupId: string) => ['balances', groupId, 'ledger'] as const,
  settlements: (groupId: string) => ['balances', groupId, 'settlements'] as const,
  analytics:   (groupId: string, months: number) => ['balances', groupId, 'analytics', months] as const,
};

export function useBalances(groupId: string) {
  return useQuery({
    queryKey: balanceKeys.balances(groupId),
    queryFn:  () => balancesApi.get(groupId),
    enabled:  !!groupId,
    staleTime: 30_000,
  });
}

export function useSettlementSuggestions(groupId: string) {
  return useQuery({
    queryKey: balanceKeys.optimized(groupId),
    queryFn:  () => balancesApi.optimized(groupId),
    enabled:  !!groupId,
    staleTime: 30_000,
  });
}

export function useLedger(groupId: string) {
  return useInfiniteQuery({
    queryKey: balanceKeys.ledger(groupId),
    queryFn:  ({ pageParam }) => balancesApi.ledger(groupId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!groupId,
  });
}

export function useCreateSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { payeeId: string; amount: number }) =>
      balancesApi.createSettlement(groupId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances', groupId] });
      toast.success('Settlement recorded! 🎉');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useSettlements(groupId: string) {
  return useQuery({
    queryKey: balanceKeys.settlements(groupId),
    queryFn:  () => balancesApi.listSettlements(groupId),
    enabled:  !!groupId,
  });
}

export function useAnalytics(groupId: string, months = 6) {
  return useQuery({
    queryKey: balanceKeys.analytics(groupId, months),
    queryFn:  () => balancesApi.analytics(groupId, months),
    enabled:  !!groupId,
    staleTime: 5 * 60_000,
  });
}

// ─── Recurring ────────────────────────────────────────────────────────────────
export const recurringKeys = {
  list: (groupId: string) => ['recurring', groupId] as const,
};

export function useRecurringTemplates(groupId: string) {
  return useQuery({
    queryKey: recurringKeys.list(groupId),
    queryFn:  () => recurringApi.list(groupId),
    enabled:  !!groupId,
  });
}

export function useCreateRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof recurringApi.create>[1]) =>
      recurringApi.create(groupId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recurringKeys.list(groupId) });
      toast.success('Recurring expense created');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Parameters<typeof recurringApi.update>[2] }) =>
      recurringApi.update(groupId, templateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recurringKeys.list(groupId) });
      toast.success('Recurring expense updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteRecurring(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => recurringApi.delete(groupId, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recurringKeys.list(groupId) });
      toast.success('Recurring expense deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
