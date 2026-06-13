import { cn, getInitials } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

// ─── Avatar ───────────────────────────────────────────────────────────────────
interface AvatarProps {
  name:      string;
  src?:      string | null;
  size?:     'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_COLORS = [
  'bg-red-500',    'bg-orange-500', 'bg-amber-500',  'bg-yellow-500',
  'bg-lime-500',   'bg-green-500',  'bg-emerald-500','bg-teal-500',
  'bg-cyan-500',   'bg-sky-500',    'bg-blue-500',   'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500','bg-pink-500',
];

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const sizeMap = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeMap[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0',
        nameToColor(name),
        sizeMap[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className ?? 'h-5 w-5 text-brand-600')}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner className="h-8 w-8 text-brand-600" />
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon:     React.ReactNode;
  title:    string;
  message:  string;
  action?:  React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">{message}</p>
      {action}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open:       boolean;
  onClose:    () => void;
  title:      string;
  children:   React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col',
          className ?? 'max-w-lg'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open:       boolean;
  onClose:    () => void;
  onConfirm:  () => void;
  title:      string;
  message:    string;
  danger?:    boolean;
  loading?:   boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger, loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Spinner className="h-4 w-4 text-white" /> : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function CategoryBadge({ category }: { category: string }) {
  const config: Record<string, string> = {
    RENT:         'badge-blue',
    UTILITIES:    'badge-yellow',
    GROCERIES:    'badge-green',
    SUBSCRIPTION: 'badge-purple',
    ONE_TIME:     'badge',
    OTHER:        'badge-gray',
  };
  const labels: Record<string, string> = {
    RENT: 'Rent', UTILITIES: 'Utilities', GROCERIES: 'Groceries',
    SUBSCRIPTION: 'Subscription', ONE_TIME: 'One-time', OTHER: 'Other',
  };
  return <span className={config[category] ?? 'badge-gray'}>{labels[category] ?? category}</span>;
}
