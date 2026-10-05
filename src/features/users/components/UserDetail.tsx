"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import UserAuditCard from "@/features/users/components/UserAuditCard";
import UserDeleteDialog from "@/features/users/components/UserDeleteDialog";
import UserEditProfileCard from "@/features/users/components/UserEditProfileCard";
import UserResetPasswordCard from "@/features/users/components/UserResetPasswordCard";
import UserStatusCard from "@/features/users/components/UserStatusCard";
import type { ManagedUserDetail } from "@/features/users/types/user.types";
import { roleLabel } from "@/features/users/utils/userLabels";
import { RecordSection } from "@/shared/components/RecordSection";
import { formatDateTime } from "@/shared/utils/formatDate";

interface UserDetailProps {
  user: ManagedUserDetail;
  /** Id of the signed-in user; used to detect "this is your own account". */
  currentUserId: string | null;
  onUserChange: (user: ManagedUserDetail) => void;
  onNotify: (message: string) => void;
  /** Called after the user was deleted (or turned out to be deleted already). */
  onDeleted: (message: string) => void;
}

export default function UserDetail({ user, currentUserId, onUserChange, onNotify, onDeleted }: UserDetailProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const name = user.name ?? "";
  const email = user.email ?? "";
  const displayName = name || email || "(No name)";
  const isBlocked = user.is_active === false;
  const isSelf = currentUserId !== null && String(user.id).toLowerCase() === currentUserId.toLowerCase();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/dashboard/users" className="text-sm text-slate hover:text-fg">
        ← Back to users
      </Link>

      {isBlocked && (
        <div
          role="status"
          className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          This account is blocked. The user cannot sign in.
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-light text-lg font-semibold text-slate">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl text-fg">{displayName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RoleBadge role={user.role} />
            <StatusBadge isBlocked={isBlocked} />
          </div>
        </div>
      </div>

      {isSelf && (
        <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink-soft">
          This is your account.
        </p>
      )}

      <RecordSection title="User information">
        <InfoItem label="Name">{name || "-"}</InfoItem>
        <InfoItem label="Email">{email || "-"}</InfoItem>
        <InfoItem label="Role">
          <RoleBadge role={user.role} />
        </InfoItem>
        <InfoItem label="Status">
          <StatusBadge isBlocked={isBlocked} />
        </InfoItem>
        <InfoItem label="Created">{formatDateTime(user.created_at) || "-"}</InfoItem>
        <InfoItem label="Last updated">{formatDateTime(user.updated_at) || "-"}</InfoItem>
      </RecordSection>

      <UserEditProfileCard user={user} isSelf={isSelf} onUserChange={onUserChange} onNotify={onNotify} />

      <UserResetPasswordCard userId={user.id} userLabel={displayName} isSelf={isSelf} onNotify={onNotify} />

      <UserStatusCard
        user={user}
        userLabel={displayName}
        isSelf={isSelf}
        onUserChange={onUserChange}
        onNotify={onNotify}
      />

      <UserAuditCard userId={user.id} userLabel={displayName} />

      <div className="rounded-lg border border-danger/30 bg-surface p-6">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">Danger zone</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">
            {isSelf
              ? "You can't delete your own account."
              : "Deleting a user ends their access and transfers their records to another user. You'll review what changes first."}
          </p>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            disabled={isSelf}
            className="shrink-0 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete user
          </button>
        </div>
      </div>

      <UserDeleteDialog
        isOpen={isDeleteOpen}
        userId={user.id}
        userLabel={displayName}
        onClose={() => setIsDeleteOpen(false)}
        onUserChange={onUserChange}
        onDeleted={onDeleted}
        onNotify={onNotify}
      />
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <div className="mt-0.5 break-words text-sm text-fg">{children}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: string | null | undefined }) {
  return (
    <span className="rounded-full bg-slate-light px-2.5 py-1 text-xs font-medium text-slate">{roleLabel(role)}</span>
  );
}

function StatusBadge({ isBlocked }: { isBlocked: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        isBlocked ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
      }`}
    >
      {isBlocked ? "Blocked" : "Active"}
    </span>
  );
}
