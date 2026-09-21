"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import AccountList from "@/features/accounts/components/AccountList";
import { AccountService } from "@/features/accounts/services/AccountService";
import type { Account } from "@/features/accounts/types/account.types";

function AccountsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AccountService.getAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const createdId = searchParams.get("created");
    const message = createdId
      ? "Account created successfully"
      : searchParams.get("updated") === "1"
      ? "Account updated successfully"
      : null;
    if (message) {
      setToast(message);
      router.replace("/dashboard/accounts");
      const timer = window.setTimeout(() => setToast(null), 3000);
      if (createdId && createdId !== "1") {
        setHighlightId(createdId);
        window.setTimeout(() => setHighlightId(null), 2000);
      }
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      <AccountList
        accounts={accounts}
        isLoading={isLoading}
        highlightId={highlightId}
        onAccountDeleted={(id) => setAccounts((prev) => prev.filter((a) => a.id !== id))}
      />
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg animate-toast-in">
          <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
          {toast}
        </div>
      )}
    </>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsPageInner />
    </Suspense>
  );
}
