"use client";

import { useRouter } from "next/navigation";
import AccountForm from "@/features/accounts/components/AccountForm";
import { AccountService } from "@/features/accounts/services/AccountService";
import type { CreateAccountPayload } from "@/features/accounts/types/account.types";

export default function NewAccountPage() {
  const router = useRouter();

  async function handleSubmit(payload: CreateAccountPayload) {
    const account = await AccountService.createAccount(payload);
    router.push(`/dashboard/accounts?created=${account.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl rounded-lg border border-line bg-surface p-6">
      <AccountForm mode="create" onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  );
}
