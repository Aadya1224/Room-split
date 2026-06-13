import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, ArrowUpRight } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuthStore } from '@/store/authStore';
import { Avatar, CategoryBadge, EmptyState, PageSpinner, Spinner } from '@/components/ui';
import { formatCurrency, formatDate, CATEGORY_CONFIG } from '@/lib/utils';
import ExpenseFormModal from './ExpenseFormModal';
import type { Expense } from '@roomsplit/types';

// ─── Per-group expenses section ───────────────────────────────────────────────
function GroupExpenses({
  groupId,
  groupName,
  categoryFilter,
}: {
  groupId:        string;
  groupName:      string;
  categoryFilter: string;
}) {
  const user   = useAuthStore((s) => s.user);
  const params = categoryFilter ? { category: categoryFilter } : undefined;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useExpenses(groupId, params);

  const allExpenses = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner className="h-5 w-5 text-brand-500" />
      </div>
    );
  }

  if (!allExpenses.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <Link
          to={`/groups/${groupId}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-brand-600"
        >
          {groupName}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <span className="text-xs text-gray-400">{allExpenses.length} expense{allExpenses.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card overflow-hidden divide-y divide-gray-50">
        {allExpenses.map((expense: Expense) => {
          const cfg     = CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.OTHER;
          const isPayer = expense.paidById === user?.id;
          const myShare = expense.splits.find((s) => s.userId === user?.id);

          return (
            <div key={expense.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${cfg.bgColor}`}>
                {cfg.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{formatDate(expense.expenseDate)}</span>
                  <span className="text-gray-300">·</span>
                  {isPayer ? (
                    <span className="text-xs text-brand-600 font-medium">You paid</span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {expense.paidBy.name} paid
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(expense.amount)}
                </p>
                {myShare && (
                  <p className={`text-xs font-medium ${isPayer ? 'text-green-600' : 'text-red-500'}`}>
                    {isPayer ? `+${formatCurrency(Number(expense.amount) - Number(myShare.amount))}` : `-${formatCurrency(myShare.amount)}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {hasNextPage && (
          <div className="px-5 py-3">
            <button
              className="btn-secondary w-full btn-sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? <Spinner className="h-4 w-4" /> : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const CATEGORY_FILTERS = [
  { value: '',             label: 'All' },
  { value: 'RENT',         label: '🏠 Rent' },
  { value: 'UTILITIES',    label: '⚡ Utilities' },
  { value: 'GROCERIES',    label: '🛒 Groceries' },
  { value: 'SUBSCRIPTION', label: '📺 Subscriptions' },
  { value: 'ONE_TIME',     label: '🛍️ One-time' },
  { value: 'OTHER',        label: '📌 Other' },
];

export default function ExpensesPage() {
  const { data: groups, isLoading } = useGroups();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">All expenses across your groups</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddExpense(true)}>
          <Plus className="h-4 w-4" /> Add expense
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
              categoryFilter === f.value
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Groups + expenses */}
      {!groups?.length ? (
        <EmptyState
          icon="🧾"
          title="No expenses yet"
          message="Join or create a group, then add your first shared expense."
          action={
            <button className="btn-primary" onClick={() => setShowAddExpense(true)}>
              <Plus className="h-4 w-4" /> Add expense
            </button>
          }
        />
      ) : (
        <>
          {groups.map((g) => (
            <GroupExpenses
              key={g.id}
              groupId={g.id}
              groupName={g.name}
              categoryFilter={categoryFilter}
            />
          ))}
        </>
      )}

      <ExpenseFormModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
      />
    </div>
  );
}
