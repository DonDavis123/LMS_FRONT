"use client";

import { useState } from "react";
import ConfirmActionDialog from "@/features/users/components/ConfirmActionDialog";
import { userService } from "@/features/users/services/userService";
import type { ManagedUserDetail } from "@/features/users/types/user.types";
import { RecordSection } from "@/shared/components/RecordSection";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";

interface UserStatusCardProps {
  user: ManagedUserDetail;
  userLabel: string;
  /** Backend rejects blocking your own account, so the action is disabled. */
  isSelf: boolean;
  onUserChange: (user: ManagedUserDetail) => void;
  onNotify: (message: string) => void;
}

export default function UserStatusCard({ user, userLabel, isSelf, onUserChange, onNotify }: UserStatusCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBlocked = user.is_active === false;

  async function handleConfirm() {
    setIsBusy(true);
    setError(null);
    try {
      const updated = isBlocked ? await userService.unblockUser(user.id) : await userService.blockUser(user.id);
      onUserChange(updated);
      onNotify(isBlocked ? "User unblocked successfully" : "User blocked successfully");
    } catch (err) {
      setError(
        extractApiError(err, isBlocked ? "Couldn't unblock this user. Try again." : "Couldn't block this user. Try again.")
      );
    } finally {
      setIsBusy(false);
      setIsConfirmOpen(false);
    }
  }

  return (
    <RecordSection title="Account status">
      <div className="space-y-3 sm:col-span-2">
        <p className="text-sm text-ink-soft">
          {isBlocked
            ? "This account is blocked. The user cannot sign in until you unblock it."
            : "Blocking prevents this user from signing in and signs them out of every session. You can unblock them at any time."}
        </p>

        {isSelf && <p className="text-xs text-ink-soft">You can&apos;t block your own account.</p>}

        {error && (
          <p className="animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={isSelf || isBusy}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
            isBlocked
              ? "bg-ink text-white hover:bg-ink-2"
              : "border border-danger/40 bg-danger-soft text-danger hover:opacity-90"
          }`}
        >
          {isBusy && <Spinner size="sm" />}
          {isBlocked ? "Unblock user" : "Block user"}
        </button>
      </div>

      <ConfirmActionDialog
        isOpen={isConfirmOpen}
        title={isBlocked ? "Unblock this user?" : "Block this user?"}
        message={
          isBlocked
            ? `${userLabel} will be able to sign in again.`
            : `${userLabel} will no longer be able to sign in and will be signed out of every session.`
        }
        confirmLabel={isBlocked ? "Unblock" : "Block"}
        tone={isBlocked ? "primary" : "danger"}
        isBusy={isBusy}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </RecordSection>
  );
}
