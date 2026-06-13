import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { SplitSquareVertical, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useLogin } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const login          = useLogin();
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-600 mb-4 shadow-lg">
            <SplitSquareVertical className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RoomSplit</h1>
          <p className="text-gray-500 mt-1">Split expenses with your roommates</p>
        </div>

        <div className="card card-body shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                {...register('email')}
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
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
              disabled={login.isPending}
            >
              {login.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 mb-1">Demo accounts</p>
            <p className="text-xs text-blue-600">arjun@example.com / password123</p>
            <p className="text-xs text-blue-600">priya@example.com / password123</p>
          </div>

          <p className="text-sm text-center text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
