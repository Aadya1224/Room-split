import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, Receipt, BarChart2, RefreshCw, Copy, Check,
  Plus, Trash2, ArrowUpRight, ArrowDownLeft, Pencil,
} from 'lucide-react';
import { useGroup } from '@/hooks/useGroups';
import {
  useBalances, useSettlementSuggestions, useExpenses,
  useDeleteExpense, useCreateSettlement, useRecurringTemplates,
  useUpdateRecurring, useDeleteRecurring,
} from '@/hooks/useExpenses';
import { useAuthStore } from '@/store/authStore';
import {
  Avatar, CategoryBadge, ConfirmDialog, EmptyState, PageSpinner, Spinner,
} from '@/components/ui';
import { formatCurrency, formatDate, formatRelative, CATEGORY_CONFIG } from '@/lib/utils';
import ExpenseFormModal from '@/pages/expenses/ExpenseFormModal';
import RecurringFormModal from '@/components/expense/RecurringFormModal';
import SpendingChart from '@/components/charts/SpendingChart';
import type { Expense, RecurringTemplate } from '@roomsplit/types';

type Tab = 'expenses' | 'balances' | 'analytics' | 'recurring' | 'members';

// ─── Balance Sheet ────────────────────────────────────────────────────────────
function BalancesTab({ groupId }: { groupId: string }) {
  const user             = useAuthStore((s) => s.user);
  const { data: balances, isLoading: balLoading }    = useBalances(groupId);
  const { data: suggestions, isLoading: sugLoading } = useSettlementSuggestions(groupId);
  const createSettlement = useCreateSettlement(groupId);
  const [settling, setSettling] = useState<{ payeeId: string; amount: number; name: string } | null>(null);

  if (balLoading || sugLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="space-y-6">
      {/* Net balances */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Net balances</h3>
          <p className="text-xs text-gray-500 mt-0.5">Positive = owed money · Negative = owes money</p>
        </div>
        <div className="divide-y divide-gray-50">
          {balances?.map((b) => {
            const isMe     = b.userId === user?.id;
            const isOwed   = b.netBalance > 0.01;
            const isDebtor = b.netBalance < -0.01;
            return (
              <div key={b.userId} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={b.user.name} src={b.user.avatarUrl} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {b.user.name} {isMe && <span className="text-xs text-gray-400">(you)</span>}
                  </p>
                </div>
                <div className="text-right">
                  {!isOwed && !isDebtor && (
                    <span className="text-xs text-gray-500">Settled up ✓</span>
                  )}
                  {isOwed && (
                    <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {formatCurrency(b.netBalance)}
                    </span>
                  )}
                  {isDebtor && (
                    <span className="text-sm font-semibold text-red-500 flex items-center gap-1">
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                      {formatCurrency(Math.abs(b.netBalance))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlement suggestions */}
      {!!suggestions?.length && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Suggested settlements</h3>
            <p className="text-xs text-gray-500 mt-0.5">Minimum transactions to clear all debts</p>
          </div>
          <div className="divide-y divide-gray-50">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={s.from.name} size="sm" />
                <div className="flex-1 flex items-center gap-2 min-w-0 text-sm">
                  <span className="font-medium text-gray-900 truncate">{s.from.name}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-900 truncate">{s.to.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(s.amount)}</span>
                {s.from.id === user?.id && (
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => setSettling({ payeeId: s.to.id, amount: s.amount, name: s.to.name })}
                  >
                    Mark paid
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!suggestions?.length && (
        <div className="card card-body text-center py-8">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-semibold text-gray-900">All settled up!</p>
          <p className="text-sm text-gray-500 mt-1">No outstanding debts in this group.</p>
        </div>
      )}

      <ConfirmDialog
        open={!!settling}
        onClose={() => setSettling(null)}
        onConfirm={() => {
          if (!settling) return;
          createSettlement.mutate(
            { payeeId: settling.payeeId, amount: settling.amount },
            { onSuccess: () => setSettling(null) }
          );
        }}
        title="Record settlement"
        message={`Mark a payment of ${settling ? formatCurrency(settling.amount) : ''} to ${settling?.name} as completed?`}
        loading={createSettlement.isPending}
      />
    </div>
  );
}

// ─── Expense row ───────────────────────────────────────────────────────────────
function ExpenseRow({ expense, groupId, currentUserId }: { expense: Expense; groupId: string; currentUserId: string }) {
  const [showDelete, setShowDelete] = useState(false);
  const deleteExpense = useDeleteExpense(groupId);
  const cfg     = CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.OTHER;
  const isPayer = expense.paidById === currentUserId;

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 group transition-colors">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${cfg.bgColor}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{formatDate(expense.expenseDate)}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">
              {isPayer ? 'You paid' : `${expense.paidBy.name} paid`}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 space-y-0.5">
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
          <CategoryBadge category={expense.category} />
        </div>
        {isPayer && (
          <button
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400
                       hover:text-red-600 hover:bg-red-50 transition-all"
            onClick={() => setShowDelete(true)}
            title="Delete expense"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() =>
          deleteExpense.mutate(expense.id, { onSuccess: () => setShowDelete(false) })
        }
        title="Delete expense"
        message={`Delete "${expense.description}"? The ledger entries will be reversed. This cannot be undone.`}
        danger
        loading={deleteExpense.isPending}
      />
    </>
  );
}

// ─── Expenses Tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ groupId }: { groupId: string }) {
  const user = useAuthStore((s) => s.user);
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useExpenses(groupId);
  const allExpenses = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;

  return (
    <>
      <div className="flex justify-end mb-3">
        <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Add expense
        </button>
      </div>

      <div className="card overflow-hidden">
        {!allExpenses.length ? (
          <EmptyState
            icon="🧾"
            title="No expenses yet"
            message="Add your first shared expense to start tracking who owes what."
            action={
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" /> Add first expense
              </button>
            }
          />
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {allExpenses.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  groupId={groupId}
                  currentUserId={user?.id ?? ''}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  className="btn-secondary w-full btn-sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? <Spinner className="h-4 w-4" /> : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ExpenseFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        defaultGroupId={groupId}
      />
    </>
  );
}

// ─── Recurring Tab ─────────────────────────────────────────────────────────────
function RecurringTab({ groupId }: { groupId: string }) {
  const { data: templates, isLoading } = useRecurringTemplates(groupId);
  const updateRecurring = useUpdateRecurring(groupId);
  const deleteRecurring = useDeleteRecurring(groupId);
  const [showCreate, setShowCreate]   = useState(false);
  const [editing, setEditing]         = useState<RecurringTemplate | null>(null);
  const [deleting, setDeleting]       = useState<RecurringTemplate | null>(null);

  if (isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;

  return (
    <>
      <div className="flex justify-end mb-3">
        <button className="btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New recurring
        </button>
      </div>

      {!templates?.length ? (
        <EmptyState
          icon="🔄"
          title="No recurring expenses"
          message="Set up monthly rent, internet bills, and subscriptions to auto-generate each period."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Add first recurring
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50">
          {templates.map((t) => {
            const cfg = CATEGORY_CONFIG[t.category] ?? CATEGORY_CONFIG.OTHER;
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 group">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${cfg.bgColor}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.frequency.charAt(0) + t.frequency.slice(1).toLowerCase()} ·{' '}
                    Next: {formatDate(t.nextRunDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(t.amount)}</p>
                  <button
                    onClick={() =>
                      updateRecurring.mutate({
                        templateId: t.id,
                        data: { isActive: !t.isActive },
                      })
                    }
                    className={`badge cursor-pointer ${t.isActive ? 'badge-green hover:bg-red-100 hover:text-red-700' : 'badge-gray hover:bg-green-100 hover:text-green-700'} transition-colors`}
                  >
                    {t.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(t)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleting(t)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecurringFormModal open={showCreate} onClose={() => setShowCreate(false)} groupId={groupId} />
      {editing && (
        <RecurringFormModal
          open={!!editing}
          onClose={() => setEditing(null)}
          groupId={groupId}
          template={editing}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleteRecurring.mutate(deleting!.id, { onSuccess: () => setDeleting(null) })
        }
        title="Delete recurring expense"
        message={`Delete "${deleting?.description}"? Future expenses will no longer be generated.`}
        danger
        loading={deleteRecurring.isPending}
      />
    </>
  );
}

// ─── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ group }: { group: NonNullable<ReturnType<typeof useGroup>['data']> }) {
  const user    = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${group.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="card card-body">
        <p className="text-sm font-medium text-gray-700 mb-2">Invite link</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={`${window.location.origin}/join/${group.inviteCode}`}
            className="input text-xs text-gray-500"
            onFocus={(e) => e.target.select()}
          />
          <button className="btn-secondary btn-sm flex-shrink-0" onClick={copyInvite}>
            {copied
              ? <Check className="h-3.5 w-3.5 text-green-600" />
              : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Share this link with roommates to invite them.</p>
      </div>

      <div className="card overflow-hidden divide-y divide-gray-50">
        {group.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={m.user.name} src={m.user.avatarUrl} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {m.user.name}{' '}
                {m.userId === user?.id && <span className="text-gray-400 font-normal">(you)</span>}
              </p>
              <p className="text-xs text-gray-500">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`badge ${m.role === 'ADMIN' ? 'badge-blue' : 'badge-gray'}`}>
                {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
              </span>
              <span className="text-xs text-gray-400">Joined {formatRelative(m.joinedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: group, isLoading } = useGroup(groupId!);
  const [tab, setTab] = useState<Tab>('expenses');

  if (isLoading) return <PageSpinner />;
  if (!group) return (
    <div className="p-6 text-center text-gray-500">
      Group not found. <Link to="/groups" className="text-brand-600 hover:underline">Back to groups</Link>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'expenses',  label: 'Expenses',  icon: Receipt    },
    { id: 'balances',  label: 'Balances',  icon: ArrowUpRight },
    { id: 'analytics', label: 'Analytics', icon: BarChart2  },
    { id: 'recurring', label: 'Recurring', icon: RefreshCw  },
    { id: 'members',   label: 'Members',   icon: Users      },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        to="/groups"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
          <Users className="h-7 w-7 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{group.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex -space-x-1.5">
              {group.members.slice(0, 5).map((m) => (
                <Avatar key={m.id} name={m.user.name} src={m.user.avatarUrl} size="sm"
                  className="ring-2 ring-white" />
              ))}
            </div>
            <span className="text-sm text-gray-500">{group.members.length} members</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                        transition-all whitespace-nowrap flex-shrink-0 ${
              tab === id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'expenses'  && <ExpensesTab  groupId={group.id} />}
        {tab === 'balances'  && <BalancesTab  groupId={group.id} />}
        {tab === 'analytics' && <SpendingChart groupId={group.id} />}
        {tab === 'recurring' && <RecurringTab groupId={group.id} />}
        {tab === 'members'   && <MembersTab   group={group} />}
      </div>
    </div>
  );
}
