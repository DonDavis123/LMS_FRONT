"use client";

import { useState } from "react";
import { History } from "lucide-react";
import UserHistoryDialog from "@/features/users/components/UserHistoryDialog";

interface UserAuditCardProps {
  userId: string;
  userLabel: string;
}

/**
 * Compact entry point to a user's activity history. The history itself is
 * kept out of the page and opens in a timeline dialog on demand.
 */
export default function UserAuditCard({ userId, userLabel }: UserAuditCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Activity history</h3>
        <p className="mt-1 text-sm text-ink-soft">See who changed this account and when.</p>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex shrink-0 items-center justify-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98]"
      >
        <History size={15} />
        View history
      </button>

      <UserHistoryDialog isOpen={isOpen} userId={userId} userLabel={userLabel} onClose={() => setIsOpen(false)} />
    </div>
  );
}
