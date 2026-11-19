"use client";

import { formCardClass } from "@/shared/components/FormLayout";
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
    <div className={formCardClass}>
      <AccountForm mode="create" onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  );
}
