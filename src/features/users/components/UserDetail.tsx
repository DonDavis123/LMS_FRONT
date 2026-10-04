"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import UserEditProfileCard from "@/features/users/components/UserEditProfileCard";
import UserResetPasswordCard from "@/features/users/components/UserResetPasswordCard";
import UserStatusCard from "@/features/users/components/UserStatusCard";
import type { ManagedUserDetail } from "@/features/users/types/user.types";
import { RecordSection } from "@/shared/components/RecordSection";
import { formatDateTime } from "@/shared/utils/formatDate";

interface UserDetailProps {
  user: ManagedUserDetail;
  /** Id of the signed-in user; used to detect "this is your own account". */
  currentUserId: string | null;
  onUserChange: (user: ManagedUserDetail) => void;
  onNotify: (message: string) => void;
  /**
   * Placeholder for the delete flow added in the next step. While it is
   * omitted the Delete button is disabled.
   */
  onDeleteClick?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

function roleLabel(role: string | null | undefined): string {
  if (!role) return "-";
  return ROLE_LABELS[role.toUpperCase()] ?? role;
}

export default function UserDetail({ user, currentUserId, onUserChange, onNotify, onDeleteClick }: UserDetailProps) {
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

      <UserEditProfileCard user={user} onUserChange={onUserChange} onNotify={onNotify} />

      <UserResetPasswordCard userId={user.id} userLabel={displayName} isSelf={isSelf} onNotify={onNotify} />

      <UserStatusCard
        user={user}
        userLabel={displayName}
        isSelf={isSelf}
        onUserChange={onUserChange}
        onNotify={onNotify}
      />

      {/* Danger zone — the delete flow is connected in the next step. */}
      <div className="rounded-lg border border-danger/30 bg-surface p-6">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">Danger zone</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">Deleting a user removes their account. This can&apos;t be undone.</p>
          {/* A disabled button swallows hover, so the tooltip sits on the wrapper. */}
          <span title={onDeleteClick ? undefined : "Added in the next step"} className="shrink-0">
            <button
              type="button"
              onClick={onDeleteClick}
              disabled={!onDeleteClick}
              className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete user
            </button>
          </span>
        </div>
      </div>
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
