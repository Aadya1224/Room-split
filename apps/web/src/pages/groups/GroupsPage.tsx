import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Link2, ArrowRight, Copy, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGroups, useCreateGroup, useJoinGroup } from '@/hooks/useGroups';
import { Avatar, EmptyState, Modal, PageSpinner, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';

// ─── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createGroup = useCreateGroup();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string }>({
    resolver: zodResolver(z.object({ name: z.string().min(2, 'At least 2 characters') })),
  });

  const onSubmit = (data: { name: string }) => {
    createGroup.mutate(data.name, { onSuccess: () => { reset(); onClose(); } });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a new group">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Group name</label>
          <input
            {...register('name')}
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="Koramangala Flat"
            autoFocus
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <p className="text-xs text-gray-500">
          You'll be set as admin. Share the invite link with your roommates after creating.
        </p>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={createGroup.isPending}>
            {createGroup.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Join Group Modal ─────────────────────────────────────────────────────────
function JoinGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const joinGroup = useJoinGroup();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ code: string }>({
    resolver: zodResolver(z.object({ code: z.string().min(1, 'Enter an invite code') })),
  });

  const onSubmit = (data: { code: string }) => {
    // Support full URL or just the code
    const code = data.code.split('/').pop()?.trim() ?? data.code.trim();
    joinGroup.mutate(code, { onSuccess: () => { reset(); onClose(); } });
  };

  return (
    <Modal open={open} onClose={onClose} title="Join a group">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Invite code or link</label>
          <input
            {...register('code')}
            className={`input ${errors.code ? 'input-error' : ''}`}
            placeholder="abc123xyz or full invite URL"
            autoFocus
          />
          {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={joinGroup.isPending}>
            {joinGroup.isPending ? <Spinner className="h-4 w-4 text-white" /> : 'Join group'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Invite code copy button ──────────────────────────────────────────────────
function CopyInviteButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy invite'}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your roommate groups</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setShowJoin(true)}>
            <Link2 className="h-3.5 w-3.5" /> Join
          </button>
          <button className="btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New group
          </button>
        </div>
      </div>

      {/* List */}
      {!groups?.length ? (
        <EmptyState
          icon="🏠"
          title="No groups yet"
          message="Create a group to start tracking shared expenses with your roommates."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Create group
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="card card-body block hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-brand-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{group.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex -space-x-1.5">
                      {group.members.slice(0, 5).map((m) => (
                        <Avatar key={m.id} name={m.user.name} src={m.user.avatarUrl} size="sm"
                          className="ring-2 ring-white" />
                      ))}
                      {group.members.length > 5 && (
                        <div className="h-7 w-7 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center text-xs font-medium text-gray-600">
                          +{group.members.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{group.members.length} members</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">Created {formatDate(group.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <CopyInviteButton code={group.inviteCode} />
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinGroupModal   open={showJoin}   onClose={() => setShowJoin(false)} />
    </div>
  );
}
