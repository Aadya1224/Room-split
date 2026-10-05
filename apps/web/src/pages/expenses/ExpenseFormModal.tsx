import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useGroups } from '@/hooks/useGroups';
import { useCreateExpense } from '@/hooks/useExpenses';
import { Modal, Spinner, Avatar } from '@/components/ui';
import { CATEGORY_CONFIG, SPLIT_TYPE_LABELS } from '@/lib/utils';
import type { Group } from '@roomsplit/types';

// ─── Schema ───────────────────────────────────────────────────────────────────
const splitInputSchema = z.object({
  userId:     z.string(),
  name:       z.string(),
  amount:     z.coerce.number().min(0).optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  weight:     z.coerce.number().min(0).optional(),
});

const schema = z.object({
  groupId:     z.string().min(1, 'Select a group'),
  description: z.string().min(1, 'Description is required').max(200),
  amount:      z.coerce.number().positive('Amount must be positive'),
  category:    z.enum(['RENT','UTILITIES','GROCERIES','SUBSCRIPTION','ONE_TIME','OTHER']),
  splitType:   z.enum(['EQUAL','PERCENTAGE','FIXED','WEIGHTED']),
  expenseDate: z.string(),
  splits:      z.array(splitInputSchema).optional(),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  icon:  cfg.icon,
}));

// ─── Split editor ─────────────────────────────────────────────────────────────
function SplitEditor({
  splitType,
  members,
  totalAmount,
  control,
  register,
}: {
  splitType:   FormValues['splitType'];
  members:     Array<{ userId: string; name: string; avatarUrl: string | null }>;
  totalAmount: number;
  control:     any;
  register:    any;
}) {
  const { fields } = useFieldArray({ control, name: 'splits' });

  if (splitType === 'EQUAL') {
    const share = members.length ? totalAmount / members.length : 0;
    return (
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <Avatar name={m.name} src={m.avatarUrl} size="sm" />
              <span className="text-sm text-gray-700">{m.name}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              ₹{isNaN(share) ? '0.00' : share.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (splitType === 'PERCENTAGE') {
    return (
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-2">
            <Avatar name={(field as any).name} size="sm" className="flex-shrink-0" />
            <span className="text-sm text-gray-700 flex-1">{(field as any).name}</span>
            <div className="flex items-center gap-1">
              <input
                {...register(`splits.${idx}.percentage`)}
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="input w-20 text-right"
                placeholder="0"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-1">Percentages must sum to 100%</p>
      </div>
    );
  }

  if (splitType === 'FIXED') {
    return (
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-2">
            <Avatar name={(field as any).name} size="sm" className="flex-shrink-0" />
            <span className="text-sm text-gray-700 flex-1">{(field as any).name}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">₹</span>
              <input
                {...register(`splits.${idx}.amount`)}
                type="number"
                min="0"
                step="0.01"
                className="input w-24 text-right"
                placeholder="0.00"
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-1">Fixed amounts must sum to total</p>
      </div>
    );
  }

  // WEIGHTED
  return (
    <div className="space-y-2">
      {fields.map((field, idx) => (
        <div key={field.id} className="flex items-center gap-2">
          <Avatar name={(field as any).name} size="sm" className="flex-shrink-0" />
          <span className="text-sm text-gray-700 flex-1">{(field as any).name}</span>
          <div className="flex items-center gap-1">
            <input
              {...register(`splits.${idx}.weight`)}
              type="number"
              min="1"
              step="1"
              className="input w-20 text-right"
              placeholder="1"
            />
            <span className="text-xs text-gray-500">share</span>
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-400 mt-1">Shares are relative (e.g. 2 = double share)</p>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface Props {
  open:         boolean;
  onClose:      () => void;
  defaultGroupId?: string;
}

export default function ExpenseFormModal({ open, onClose, defaultGroupId }: Props) {
  const { data: groups } = useGroups();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      groupId:     defaultGroupId ?? '',
      description: '',
      amount:      0,
      category:    'OTHER',
      splitType:   'EQUAL',
      expenseDate: new Date().toISOString().slice(0, 10),
      splits:      [],
    },
  });

  const watchedGroupId  = watch('groupId');
  const watchedSplitType = watch('splitType');
  const watchedAmount   = watch('amount');

  // Find selected group and its members
  const selectedGroup: Group | undefined = groups?.find((g) => g.id === watchedGroupId);
  const members = selectedGroup?.members.map((m) => ({
    userId:    m.user.id,
    name:      m.user.name,
    avatarUrl: m.user.avatarUrl,
  })) ?? [];

  // Sync splits field array when group or splitType changes
  useEffect(() => {
    if (!selectedGroup) return;
    setValue(
      'splits',
      members.map((m) => ({
        userId:     m.userId,
        name:       m.name,
        amount:     0,
        percentage: parseFloat((100 / members.length).toFixed(4)),
        weight:     1,
      }))
    );
  }, [watchedGroupId, watchedSplitType]);

  const createExpense = useCreateExpense(watchedGroupId);

  const onSubmit = (data: FormValues) => {
    const payload: any = {
      description: data.description,
      amount:      data.amount,
      category:    data.category,
      splitType:   data.splitType,
      expenseDate: new Date(data.expenseDate).toISOString(),
    };

    if (data.splitType !== 'EQUAL' && data.splits?.length) {
      payload.splits = data.splits.map((s) => ({
        userId:     s.userId,
        ...(data.splitType === 'PERCENTAGE' && { percentage: s.percentage }),
        ...(data.splitType === 'FIXED'      && { amount:     s.amount     }),
        ...(data.splitType === 'WEIGHTED'   && { weight:     s.weight     }),
      }));
    }

    createExpense.mutate(payload, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Add expense" className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Group selector */}
        <div>
          <label className="label">Group</label>
          <select {...register('groupId')} className={`input ${errors.groupId ? 'input-error' : ''}`}>
            <option value="">Select a group…</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {errors.groupId && <p className="mt-1 text-xs text-red-600">{errors.groupId.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <input
            {...register('description')}
            className={`input ${errors.description ? 'input-error' : ''}`}
            placeholder="e.g. August electricity bill"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (₹)</label>
            <input
              {...register('amount')}
              type="number"
              min="0"
              step="0.01"
              className={`input ${errors.amount ? 'input-error' : ''}`}
              placeholder="0.00"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="label">Date</label>
            <input
              {...register('expenseDate')}
              type="date"
              className="input"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat.value];
              return (
                <label
                  key={cat.value}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                    watch('category') === cat.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    {...register('category')}
                    type="radio"
                    value={cat.value}
                    className="sr-only"
                  />
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{cat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Split type */}
        <div>
          <label className="label">Split method</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SPLIT_TYPE_LABELS).map(([value, label]) => (
              <label
                key={value}
                className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  watchedSplitType === value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  {...register('splitType')}
                  type="radio"
                  value={value}
                  className="sr-only"
                />
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Split detail */}
        {selectedGroup && members.length > 0 && (
          <div>
            <label className="label">Split details</label>
            <div className="bg-gray-50 rounded-lg p-3">
              <SplitEditor
                splitType={watchedSplitType}
                members={members}
                totalAmount={Number(watchedAmount) || 0}
                control={control}
                register={register}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={createExpense.isPending || !watchedGroupId}
          >
            {createExpense.isPending ? (
              <Spinner className="h-4 w-4 text-white" />
            ) : (
              'Add expense'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
