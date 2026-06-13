import { AppError } from '../../shared/errors';
import type { SplitType, ExpenseSplitInput } from '@roomsplit/types';

export interface SplitResult {
  userId:     string;
  amount:     number;  // exact paise-level amount
  percentage: number;  // 0–100
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Calculate how an expense should be split among members.
 * All amounts are in the smallest currency unit (paise / cents).
 */
export function calculateSplits(
  totalAmount: number,
  splitType:   SplitType,
  members:     string[],
  customSplits?: ExpenseSplitInput[]
): SplitResult[] {

  if (members.length === 0) {
    throw new AppError('At least one member required for split');
  }

  switch (splitType) {

    // ── EQUAL ────────────────────────────────────────────────────────────────
    case 'EQUAL': {
      const share = totalAmount / members.length;
      const baseShare = round2(share);
      // Floating-point rounding: first member absorbs any remainder
      const remainder = round2(totalAmount - baseShare * members.length);

      return members.map((userId, idx) => ({
        userId,
        amount: idx === 0 ? round2(baseShare + remainder) : baseShare,
        percentage: round2(100 / members.length),
      }));
    }

    // ── PERCENTAGE ───────────────────────────────────────────────────────────
    case 'PERCENTAGE': {
      if (!customSplits?.length) {
        throw new AppError('Percentage splits require customSplits');
      }
      const total = customSplits.reduce((s, m) => s + (m.percentage ?? 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new AppError(`Percentages must sum to 100 (got ${total.toFixed(2)})`);
      }
      const results = customSplits.map((m) => ({
        userId:     m.userId,
        amount:     round2(totalAmount * (m.percentage ?? 0) / 100),
        percentage: round2(m.percentage ?? 0),
      }));
      // Fix rounding drift on last member
      const sumAmounts = results.reduce((s, r) => s + r.amount, 0);
      const drift = round2(totalAmount - sumAmounts);
      if (results.length > 0) results[results.length - 1].amount = round2(results[results.length - 1].amount + drift);
      return results;
    }

    // ── FIXED ─────────────────────────────────────────────────────────────────
    case 'FIXED': {
      if (!customSplits?.length) {
        throw new AppError('Fixed splits require customSplits');
      }
      const total = customSplits.reduce((s, m) => s + (m.amount ?? 0), 0);
      if (Math.abs(total - totalAmount) > 0.01) {
        throw new AppError(`Fixed amounts must sum to ${totalAmount} (got ${total.toFixed(2)})`);
      }
      return customSplits.map((m) => ({
        userId:     m.userId,
        amount:     round2(m.amount ?? 0),
        percentage: round2((m.amount ?? 0) / totalAmount * 100),
      }));
    }

    // ── WEIGHTED ─────────────────────────────────────────────────────────────
    case 'WEIGHTED': {
      if (!customSplits?.length) {
        throw new AppError('Weighted splits require customSplits');
      }
      const totalWeight = customSplits.reduce((s, m) => s + (m.weight ?? 1), 0);
      if (totalWeight <= 0) throw new AppError('Total weight must be positive');

      const results = customSplits.map((m) => {
        const w = m.weight ?? 1;
        return {
          userId:     m.userId,
          amount:     round2(totalAmount * w / totalWeight),
          percentage: round2(w / totalWeight * 100),
        };
      });
      // Fix rounding drift on last member
      const sumAmounts = results.reduce((s, r) => s + r.amount, 0);
      const drift = round2(totalAmount - sumAmounts);
      if (results.length > 0) results[results.length - 1].amount = round2(results[results.length - 1].amount + drift);
      return results;
    }

    default:
      throw new AppError(`Unknown split type: ${splitType}`);
  }
}
