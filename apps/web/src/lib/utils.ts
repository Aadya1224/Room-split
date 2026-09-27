import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// ─── Class name helper ────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export function formatCurrency(amount: number | string, currency = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(num);
}

export function parseCurrency(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(num * 100) / 100;
}

// ─── Dates ────────────────────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy, h:mm a');
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// ─── Category colours ─────────────────────────────────────────────────────────
export const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  RENT:         { label: 'Rent',         color: 'text-blue-700',   bgColor: 'bg-blue-100',   icon: '🏠' },
  UTILITIES:    { label: 'Utilities',    color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: '⚡' },
  GROCERIES:    { label: 'Groceries',    color: 'text-green-700',  bgColor: 'bg-green-100',  icon: '🛒' },
  SUBSCRIPTION: { label: 'Subscription', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: '📺' },
  ONE_TIME:     { label: 'One-time',     color: 'text-orange-700', bgColor: 'bg-orange-100', icon: '🛍️' },
  OTHER:        { label: 'Other',        color: 'text-gray-700',   bgColor: 'bg-gray-100',   icon: '📌' },
};

// ─── Split type labels ─────────────────────────────────────────────────────────
export const SPLIT_TYPE_LABELS: Record<string, string> = {
  EQUAL:      'Equal split',
  PERCENTAGE: 'Percentage split',
  FIXED:      'Fixed amounts',
  WEIGHTED:   'Weighted split',
};

// ─── Frequency labels ─────────────────────────────────────────────────────────
export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY:   'Daily',
  WEEKLY:  'Weekly',
  MONTHLY: 'Monthly',
  YEARLY:  'Yearly',
};

// ─── Initials avatar ──────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Error message extraction ─────────────────────────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { data?: { error?: string } } };
    return axiosErr.response?.data?.error ?? 'Something went wrong';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
