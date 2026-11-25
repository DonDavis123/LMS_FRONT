"use client";

import { formCardClass } from "@/shared/components/FormLayout";
import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSafeReturnTo, withReturnTo } from "@/shared/utils/returnTo";
import ContactDetail from "@/features/contacts/components/ContactDetail";
import ContactForm from "@/features/contacts/components/ContactForm";
import { ContactService } from "@/features/contacts/services/ContactService";
import type { Contact, CreateContactPayload } from "@/features/contacts/types/contact.types";
import DetailLoader from "@/shared/components/DetailLoader";
import DetailSkeleton from "@/shared/components/DetailSkeleton";

function ContactDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "1";
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

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

    router.push(withReturnTo(`/dashboard/contacts/${params.id}`, returnTo));
  } catch (error) {
    console.error("Failed to update contact:", error);
    setError("Couldn't update this contact.");
  }
}

  if (error) return <p className="text-sm text-danger">{error}</p>;
  return (
    <DetailLoader ready={!!contact} skeleton={<DetailSkeleton summary cards={1} fields={6} />}>
      {contact &&
        (isEditing ? (
          <div className={formCardClass}>
            <ContactForm
              mode="edit"
              initialContact={contact}
              onSubmit={handleSubmit}
              onCancel={() => router.push(withReturnTo(`/dashboard/contacts/${params.id}`, returnTo))}
            />
          </div>
        ) : (
          <ContactDetail contact={contact} onContactChange={setContact} />
        ))}
    </DetailLoader>
  );
}

export default function ContactDetailPage() {
  return (
    <Suspense fallback={null}>
      <ContactDetailPageInner />
    </Suspense>
  );
}
