"use client";

import { formCardClass } from "@/shared/components/FormLayout";
import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSafeReturnTo, withReturnTo } from "@/shared/utils/returnTo";
import AccountDetail from "@/features/accounts/components/AccountDetail";
import AccountForm from "@/features/accounts/components/AccountForm";
import { AccountService } from "@/features/accounts/services/AccountService";
import type { Account, CreateAccountPayload } from "@/features/accounts/types/account.types";
import DetailLoader from "@/shared/components/DetailLoader";
import DetailSkeleton from "@/shared/components/DetailSkeleton";

function AccountDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "1";
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AccountService.getAccount(params.id)
      .then((data) => {
        if (!cancelled) setAccount(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this company.");
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
  
      router.push(withReturnTo(`/dashboard/accounts/${params.id}`, returnTo));
    } catch (error) {
      console.error("Failed to update company:", error);
      setError("Couldn't update this company.");
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  return (
    <DetailLoader ready={!!account} skeleton={<DetailSkeleton summary avatar cards={1} fields={6} />}>
      {account &&
        (isEditing ? (
          <div className={formCardClass}>
            <AccountForm
              mode="edit"
              initialAccount={account}
              onSubmit={handleSubmit}
              onCancel={() => router.push(withReturnTo(`/dashboard/accounts/${params.id}`, returnTo))}
            />
          </div>
        ) : (
          <AccountDetail account={account} onAccountChange={setAccount} />
        ))}
    </DetailLoader>
  );
}

export default function AccountDetailPage() {
  return (
    <Suspense fallback={null}>
      <AccountDetailPageInner />
    </Suspense>
  );
}
