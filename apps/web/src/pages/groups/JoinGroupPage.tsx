import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SplitSquareVertical, Users, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useJoinGroup } from '@/hooks/useGroups';
import { Spinner } from '@/components/ui';

export default function JoinGroupPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const accessToken    = useAuthStore((s) => s.accessToken);
  const isHydrated     = useAuthStore((s) => s.isHydrated);
  const joinGroup      = useJoinGroup();
  const navigate       = useNavigate();
  const [attempted, setAttempted] = useState(false);

  // Auto-join once authenticated
  useEffect(() => {
    if (!isHydrated || !inviteCode || attempted) return;
    if (!accessToken) return; // wait for login

    setAttempted(true);
    joinGroup.mutate(inviteCode, {
      onSuccess: (group) => navigate(`/groups/${group.id}`, { replace: true }),
      onError:   ()      => navigate('/groups', { replace: true }),
    });
  }, [isHydrated, accessToken, inviteCode, attempted]);

  // Not logged in → prompt to login/register
  if (isHydrated && !accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-600 mb-6 shadow-lg">
            <SplitSquareVertical className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You've been invited!</h1>
          <p className="text-gray-500 mb-8">
            Sign in or create an account to join this RoomSplit group.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to={`/login?redirect=/join/${inviteCode}`}
              className="btn-primary btn-lg w-full"
            >
              <LogIn className="h-5 w-5" /> Sign in to join
            </Link>
            <Link
              to={`/register?redirect=/join/${inviteCode}`}
              className="btn-secondary btn-lg w-full"
            >
              <Users className="h-5 w-5" /> Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in → joining in progress
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner className="h-8 w-8 text-brand-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Joining group…</p>
      </div>
    </div>
  );
}
