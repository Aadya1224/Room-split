import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateRecurring, useUpdateRecurring } from '@/hooks/useExpenses';
import { Modal, Spinner } from '@/components/ui';
import { CATEGORY_CONFIG, FREQUENCY_LABELS } from '@/lib/utils';
import type { RecurringTemplate } from '@roomsplit/types';

const schema = z.object({
  description: z.string().min(1, 'Required').max(200),
  amount:      z.coerce.number().positive('Must be positive'),
  category:    z.enum(['RENT','UTILITIES','GROCERIES','SUBSCRIPTION','ONE_TIME','OTHER']),
  splitType:   z.enum(['EQUAL','PERCENTAGE','FIXED','WEIGHTED']).default('EQUAL'),
  frequency:   z.enum(['DAILY','WEEKLY','MONTHLY','YEARLY']),
  nextRunDate: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  groupId:   string;
  template?: RecurringTemplate; // if provided → edit mode
}

export default function RecurringFormModal({ open, onClose, groupId, template }: Props) {
  const createRecurring = useCreateRecurring(groupId);
  const updateRecurring = useUpdateRecurring(groupId);
  const isEdit = !!template;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: template?.description ?? '',
      amount:      template ? parseFloat(template.amount) : 0,
      category:    (template?.category as any) ?? 'OTHER',
      splitType:   (template?.splitType as any) ?? 'EQUAL',
      frequency:   (template?.frequency as any) ?? 'MONTHLY',
      nextRunDate: template
        ? template.nextRunDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      nextRunDate: new Date(data.nextRunDate).toISOString(),
    };

    if (isEdit) {
      updateRecurring.mutate(
        { templateId: template!.id, data: payload },
        { onSuccess: () => { reset(); onClose(); } }
      );
    } else {
      createRecurring.mutate(payload, {
        onSuccess: () => { reset(); onClose(); },
      });
    }
  };

  const isPending = createRecurring.isPending || updateRecurring.isPending;
  const watchedCategory = watch('category');

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={isEdit ? 'Edit recurring expense' : 'New recurring expense'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Description */}
        <div>
          <label className="label">Description</label>
          <input
            {...register('description')}
            className={`input ${errors.description ? 'input-error' : ''}`}
            placeholder="e.g. Monthly Rent"
            autoFocus
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Amount + Frequency */}
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
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <label className="label">Frequency</label>
            <select {...register('frequency')} className="input">
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([value, cfg]) => (
              <label
                key={value}
                className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  watchedCategory === value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  {...register('category')}
                  type="radio"
                  value={value}
                  className="sr-only"
                />
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-xs font-medium text-gray-700">{cfg.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Split type */}
        <div>
          <label className="label">Split method</label>
          <select {...register('splitType')} className="input">
            <option value="EQUAL">Equal split (recommended)</option>
            <option value="PERCENTAGE">Percentage split</option>
            <option value="FIXED">Fixed amounts</option>
            <option value="WEIGHTED">Weighted split</option>
          </select>
        </div>

        {/* Next run date */}
        <div>
          <label className="label">First / next run date</label>
          <input
            {...register('nextRunDate')}
            type="date"
            className={`input ${errors.nextRunDate ? 'input-error' : ''}`}
          />
          {errors.nextRunDate && (
            <p className="mt-1 text-xs text-red-600">{errors.nextRunDate.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            The scheduler runs daily at midnight and will generate this expense automatically.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={() => { reset(); onClose(); }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? (
              <Spinner className="h-4 w-4 text-white" />
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
