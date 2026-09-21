"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import ContactList from "@/features/contacts/components/ContactList";
import { ContactService } from "@/features/contacts/services/ContactService";
import type { Contact } from "@/features/contacts/types/contact.types";

function ContactsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ContactService.getContacts()
      .then((data) => {
        if (!cancelled) setContacts(data);
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
      ? "Contact created successfully"
      : searchParams.get("updated") === "1"
      ? "Contact updated successfully"
      : null;
    if (message) {
      setToast(message);
      router.replace("/dashboard/contacts");
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
      <ContactList
        contacts={contacts}
        isLoading={isLoading}
        highlightId={highlightId}
        onContactDeleted={(id) => setContacts((prev) => prev.filter((c) => c.id !== id))}
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

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsPageInner />
    </Suspense>
  );
}
