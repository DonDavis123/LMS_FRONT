"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AccountDetail from "@/features/accounts/components/AccountDetail";
import AccountForm from "@/features/accounts/components/AccountForm";
import { AccountService } from "@/features/accounts/services/AccountService";
import type { Account, CreateAccountPayload } from "@/features/accounts/types/account.types";
import { CreateContactPayload } from "@/features/contacts/types/contact.types";

function AccountDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "1";

  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AccountService.getAccount(params.id)
      .then((data) => {
        if (!cancelled) setAccount(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this account.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

 
  async function handleSubmit(payload: CreateAccountPayload) {
    try {
      await AccountService.updateAccount(params.id, payload);
  
      const updatedAccount = await AccountService.getAccount(params.id);
  
      setAccount(updatedAccount);
  
      router.push(`/dashboard/accounts/${params.id}`);
    } catch (error) {
      console.error("Failed to update account:", error);
      setError("Couldn't update this account.");
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!account) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-shimmer rounded-md" />
        ))}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-line bg-surface p-6">
        <AccountForm
          mode="edit"
          initialAccount={account}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/accounts/${params.id}`)}
        />
      </div>
    );
  }

  return <AccountDetail account={account} onAccountChange={setAccount} />;
}

export default function AccountDetailPage() {
  return (
    <Suspense fallback={null}>
      <AccountDetailPageInner />
    </Suspense>
  );
}
