import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUpdateProfile } from '@/hooks/useAuth';
import { Avatar, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';

const profileSchema = z.object({
  name:      z.string().min(2, 'At least 2 characters').max(100),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfileSection() {
  const user          = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:      user?.name      ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate({
      name:      data.name,
      avatarUrl: data.avatarUrl || undefined,
    });
  };

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <User className="h-4 w-4 text-gray-400" />
        <h2 className="font-semibold text-gray-900">Profile</h2>
      </div>
      <div className="p-6">
        {/* Current avatar preview */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="lg" />
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.createdAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Member since {formatDate(user.createdAt)}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div>
            <label className="label">Full name</label>
            <input
              {...register('name')}
              className={`input ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="input"
              title="Email cannot be changed"
            />
            <p className="mt-1 text-xs text-gray-400">Email address cannot be changed.</p>
          </div>

          <div>
            <label className="label">Avatar URL (optional)</label>
            <input
              {...register('avatarUrl')}
              type="url"
              placeholder="https://example.com/avatar.jpg"
              className={`input ${errors.avatarUrl ? 'input-error' : ''}`}
            />
            {errors.avatarUrl && (
              <p className="mt-1 text-xs text-red-600">{errors.avatarUrl.message}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={updateProfile.isPending || !isDirty}
            >
              {updateProfile.isPending ? (
                <Spinner className="h-4 w-4 text-white" />
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Shield className="h-4 w-4 text-gray-400" />
        <h2 className="font-semibold text-gray-900">Security</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-900">Password</p>
            <p className="text-xs text-gray-500">Last changed: unknown</p>
          </div>
          <button className="btn-secondary btn-sm" disabled title="Coming soon">
            Change password
          </button>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-900">Active sessions</p>
            <p className="text-xs text-gray-500">Refresh tokens are rotated automatically</p>
          </div>
          <span className="badge-green">Secure</span>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Bell className="h-4 w-4 text-gray-400" />
        <h2 className="font-semibold text-gray-900">Notifications</h2>
      </div>
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Email notifications for new expenses, settlements, and recurring bills will be available in a future update.
        </p>
        <div className="mt-4 space-y-3">
          {[
            'New expense added to your group',
            'Payment reminder (you owe)',
            'Recurring expense generated',
            'Settlement confirmed',
          ].map((item) => (
            <div key={item} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item}</span>
              <label className="relative inline-flex items-center cursor-not-allowed opacity-50">
                <input type="checkbox" className="sr-only" disabled />
                <div className="w-9 h-5 bg-gray-200 rounded-full" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account preferences</p>
      </div>

      <ProfileSection />
      <SecuritySection />
      <NotificationsSection />
    </div>
  );
}
