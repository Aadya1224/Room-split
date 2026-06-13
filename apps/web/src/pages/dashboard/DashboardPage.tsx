import { Link } from 'react-router-dom';
import { Users, TrendingUp, TrendingDown, Plus, ArrowRight, Receipt } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useAuthStore } from '@/store/authStore';
import { Avatar, PageSpinner, EmptyState } from '@/components/ui';
import { formatCurrency, formatRelative } from '@/lib/utils';
import { useBalances } from '@/hooks/useExpenses';

// ─── Per-group balance summary card ──────────────────────────────────────────
function GroupBalanceCard({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  const { data: balances, isLoading } = useBalances(groupId);

  if (isLoading) return null;

  const myBalance = balances?.find((b) => b.userId === currentUserId);
  if (!myBalance) return null;

  const isOwed = myBalance.netBalance > 0;
  const isEven = Math.abs(myBalance.netBalance) < 0.01;

  if (isEven) return <span className="text-xs text-gray-500">All settled up</span>;

  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
      {isOwed ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {isOwed ? 'You are owed' : 'You owe'} {formatCurrency(Math.abs(myBalance.netBalance))}
    </div>
  );
}

export default function DashboardPage() {
  const user          = useAuthStore((s) => s.user);
  const { data: groups, isLoading } = useGroups();

  if (isLoading) return <PageSpinner />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {user?.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening across your groups.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card card-body">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Groups</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{groups?.length ?? 0}</p>
        </div>
        <div className="card card-body">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {groups?.filter((g) => g.members.length > 1).length ?? 0}
          </p>
        </div>
        <div className="card card-body col-span-2 md:col-span-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Members total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {groups?.reduce((sum, g) => sum + g.members.length, 0) ?? 0}
          </p>
        </div>
      </div>

      {/* Groups */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your groups</h2>
          <Link to="/groups" className="btn-secondary btn-sm">
            <Plus className="h-3.5 w-3.5" />
            New group
          </Link>
        </div>

        {!groups?.length ? (
          <EmptyState
            icon={<Users className="h-10 w-10 text-gray-300" />}
            title="No groups yet"
            message="Create a group with your roommates and start tracking shared expenses."
            action={
              <Link to="/groups" className="btn-primary">
                <Plus className="h-4 w-4" /> Create your first group
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="card card-body hover:shadow-md transition-shadow flex items-center gap-4 no-underline"
              >
                {/* Group icon */}
                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-brand-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{group.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex -space-x-1.5">
                      {group.members.slice(0, 4).map((m) => (
                        <Avatar key={m.id} name={m.user.name} src={m.user.avatarUrl} size="sm"
                          className="ring-2 ring-white" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">{group.members.length} members</span>
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right flex-shrink-0">
                  {user && <GroupBalanceCard groupId={group.id} currentUserId={user.id} />}
                </div>

                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/expenses" className="card card-body flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Add expense</p>
              <p className="text-xs text-gray-500">Record a new bill</p>
            </div>
          </Link>
          <Link to="/groups" className="card card-body flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="h-9 w-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Join group</p>
              <p className="text-xs text-gray-500">Use an invite link</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
