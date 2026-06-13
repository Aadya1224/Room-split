import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { SplitSquareVertical, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useRegister } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const register      = useRegister();
  const [showPw, setShowPw] = useState(false);

  const {
    register: reg,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-600 mb-4 shadow-lg">
            <SplitSquareVertical className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RoomSplit</h1>
          <p className="text-gray-500 mt-1">Split expenses with your roommates</p>
        </div>

        <div className="card card-body shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>

          <form onSubmit={handleSubmit((data) => register.mutate(data))} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                {...reg('name')}
                type="text"
                autoComplete="name"
                placeholder="Arjun Sharma"
                className={`input ${errors.name ? 'input-error' : ''}`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                {...reg('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`input ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...reg('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={register.isPending}
            >
              {register.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
