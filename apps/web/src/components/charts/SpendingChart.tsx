import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAnalytics } from '@/hooks/useExpenses';
import { formatCurrency, CATEGORY_CONFIG } from '@/lib/utils';
import { Spinner } from '@/components/ui';

const COLORS = [
  '#3b82f6', '#eab308', '#22c55e', '#a855f7',
  '#f97316', '#6b7280',
];

interface Props {
  groupId: string;
}

// ─── Monthly bar chart ─────────────────────────────────────────────────────────
function MonthlyChart({ data }: { data: any[] }) {
  const chartData = data.map((d) => ({
    month: d.month.slice(5), // "01", "02" etc.
    total: d.total,
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly spending</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Total']}
            contentStyle={{
              borderRadius: '8px',
              border:       '1px solid #e5e7eb',
              fontSize:     '12px',
            }}
          />
          <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Category pie chart ────────────────────────────────────────────────────────
function CategoryChart({ data }: { data: any[] }) {
  // Aggregate across all months
  const categoryTotals: Record<string, number> = {};
  for (const month of data) {
    for (const [cat, amount] of Object.entries(month.byCategory ?? {})) {
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + (amount as number);
    }
  }

  const pieData = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name:  CATEGORY_CONFIG[name]?.label ?? name,
      value: value as number,
    }))
    .sort((a, b) => b.value - a.value);

  if (!pieData.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">By category</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [formatCurrency(value)]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main analytics component ─────────────────────────────────────────────────
export default function SpendingChart({ groupId }: Props) {
  const { data, isLoading } = useAnalytics(groupId, 6);

  if (isLoading) {
    return (
      <div className="card card-body flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="card card-body text-center py-10 text-gray-400 text-sm">
        No spending data yet. Add some expenses to see analytics.
      </div>
    );
  }

  const totalSpend = data.reduce((sum, d) => sum + d.total, 0);
  const avgMonthly = totalSpend / data.length;

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Spending analytics</h3>
        <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-3">
          <p className="text-xs text-gray-500">Total (6 months)</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-500">Monthly average</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(avgMonthly)}</p>
        </div>
      </div>

      <div className="p-5 grid md:grid-cols-2 gap-6">
        <MonthlyChart data={data} />
        <CategoryChart data={data} />
      </div>
    </div>
  );
}
