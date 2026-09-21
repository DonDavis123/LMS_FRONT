"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ContactDetail from "@/features/contacts/components/ContactDetail";
import ContactForm from "@/features/contacts/components/ContactForm";
import { ContactService } from "@/features/contacts/services/ContactService";
import type { Contact, CreateContactPayload } from "@/features/contacts/types/contact.types";

function ContactDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "1";

  const [contact, setContact] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ContactService.getContact(params.id)
      .then((data) => {
        if (!cancelled) setContact(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this contact.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

async function handleSubmit(payload: CreateContactPayload) {
  try {
    await ContactService.updateContact(params.id, payload);

    const updatedContact = await ContactService.getContact(params.id);

    setContact(updatedContact);

    router.push(`/dashboard/contacts/${params.id}`);
  } catch (error) {
    console.error("Failed to update contact:", error);
    setError("Couldn't update this contact.");
  }
}

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!contact) {
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
        <ContactForm
          mode="edit"
          initialContact={contact}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/contacts/${params.id}`)}
        />
      </div>
    );
  }

  return <ContactDetail contact={contact} onContactChange={setContact} />;
}

export default function ContactDetailPage() {
  return (
    <Suspense fallback={null}>
      <ContactDetailPageInner />
    </Suspense>
  );
}
