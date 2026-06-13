// ─── Auth ────────────────────────────────────────────────────────────────────
export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserPublic;
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface UserPublic {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

// ─── Group ────────────────────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: UserPublic;
}

// ─── Expense ──────────────────────────────────────────────────────────────────
export type Category =
  | 'RENT'
  | 'UTILITIES'
  | 'GROCERIES'
  | 'SUBSCRIPTION'
  | 'ONE_TIME'
  | 'OTHER';

export type SplitType = 'EQUAL' | 'PERCENTAGE' | 'FIXED' | 'WEIGHTED';

export interface ExpenseSplitInput {
  userId: string;
  amount?: number;
  percentage?: number;
  weight?: number;
}

export interface CreateExpenseBody {
  description: string;
  amount: number;
  category: Category;
  splitType: SplitType;
  expenseDate?: string;
  splits?: ExpenseSplitInput[];
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  amount: string;
  description: string;
  category: Category;
  splitType: SplitType;
  receiptUrl: string | null;
  recurringId: string | null;
  expenseDate: string;
  isDeleted: boolean;
  createdAt: string;
  paidBy: UserPublic;
  splits: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: string;
  percentage: string;
  isSettled: boolean;
  user: UserPublic;
}

// ─── Balance ──────────────────────────────────────────────────────────────────
export interface Balance {
  userId: string;
  user: UserPublic;
  netBalance: number; // positive = is owed money, negative = owes money
}

export interface SettlementSuggestion {
  from: UserPublic;
  to: UserPublic;
  amount: number;
}

// ─── Recurring ────────────────────────────────────────────────────────────────
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringTemplate {
  id: string;
  groupId: string;
  description: string;
  amount: string;
  category: Category;
  splitType: SplitType;
  frequency: Frequency;
  nextRunDate: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Ledger ───────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  description: string;
  entryType: 'EXPENSE' | 'SETTLEMENT' | 'ADJUSTMENT';
  refExpenseId: string | null;
  createdAt: string;
  fromUser: UserPublic;
  toUser: UserPublic;
}

// ─── Settlement ───────────────────────────────────────────────────────────────
export interface Settlement {
  id: string;
  groupId: string;
  payerId: string;
  payeeId: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  settledAt: string | null;
  createdAt: string;
  payer: UserPublic;
  payee: UserPublic;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface MonthlySpend {
  month: string; // "2024-01"
  total: number;
  byCategory: Record<Category, number>;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}
