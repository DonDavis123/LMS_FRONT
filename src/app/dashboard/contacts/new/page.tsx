"use client";

import { formCardClass } from "@/shared/components/FormLayout";
import { useRouter } from "next/navigation";
import ContactForm from "@/features/contacts/components/ContactForm";
import { ContactService } from "@/features/contacts/services/ContactService";
import type { CreateContactPayload } from "@/features/contacts/types/contact.types";

export default function NewContactPage() {
  const router = useRouter();

  async function handleSubmit(payload: CreateContactPayload) {
    const contact = await ContactService.createContact(payload);
    router.push(`/dashboard/contacts?created=${contact.id}`);
  }

  return (
    <div className={formCardClass}>
      <ContactForm mode="create" onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  );
}
