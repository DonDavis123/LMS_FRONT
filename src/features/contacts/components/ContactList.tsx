"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contact } from "@/features/contacts/types/contact.types";
import { ContactService } from "@/features/contacts/services/ContactService";
import { userService } from "@/features/users/services/userService";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import { applyFilters } from "@/shared/utils/applyFilters";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";

import { confirmDelete } from "@/shared/utils/confirmDelete";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

interface ContactListProps {
  contacts: Contact[];
  isLoading: boolean;
  highlightId?: string | null;
  onContactDeleted: (id: string) => void;
}

const PAGE_SIZE = 10;
const ROW_REMOVE_MS = 200;

export default function ContactList({
  contacts,
  isLoading,
  highlightId,
  onContactDeleted,
}: ContactListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    userService.getLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "account_name", label: "Account", type: "text" },
      { field: "email", label: "Email", type: "text" },
      { field: "mobile", label: "Mobile", type: "text" },
      { field: "department", label: "Department", type: "text" },
      { field: "mailing_city", label: "City", type: "text" },
      {
        field: "contact_owner_id",
        label: "Contact Owner",
        type: "uuid",
        choices: owners.map((o) => ({ value: o.id, label: o.name })),
      },
      { field: "email_opt_out", label: "Email Opt Out", type: "boolean" },
      { field: "date_of_birth", label: "Date of Birth", type: "date" },
      { field: "created_at", label: "Created", type: "datetime" },
    ],
    [owners]
  );

  function getFieldValue(contact: Contact, field: string): unknown {
    return (contact as unknown as Record<string, unknown>)[field];
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const searched = contacts.filter((c) => `${c.name} ${c.email ?? ""}`.toLowerCase().includes(q));
    return applyFilters(searched, filters, getFieldValue);
  }, [contacts, query, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useSelectionKeyboard(selectionMode, selectedIds.size, handleBulkDelete);

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = filtered.length > 0 && filtered.every((row) => next.has(row.id));
      if (allSelected) filtered.forEach((row) => next.delete(row.id));
      else filtered.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!await confirmDelete(`Delete ${ids.length} selected contacts? This can't be undone.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => ContactService.deleteContact(id)));
      const deleted = results.reduce((count, result) => count + (result.status === "fulfilled" ? 1 : 0), 0);
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          onContactDeleted(ids[index]);
        }
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (deleted < ids.length) window.alert(`${deleted} deleted. ${ids.length - deleted} could not be deleted.`);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(contact: Contact) {
    if (!await confirmDelete(`Delete ${contact.name}?`)) return;
    try {
      await ContactService.deleteContact(contact.id);
      setRemovingId(contact.id);
      window.setTimeout(() => {
        onContactDeleted(contact.id);
        setRemovingId(null);
      }, ROW_REMOVE_MS);
    } catch {
      window.alert("Couldn't delete this contact. Try again.");
    }
  }


  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl text-fg">Contacts</h1>
            <p className="text-sm text-ink-soft">
              {filtered.length} total {filtered.length === 1 ? "contact" : "contacts"}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search contacts…"
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-slate focus:ring-2 focus:ring-slate-light sm:w-56"
            />
            <Link
              href="/dashboard/contacts/new"
              className="whitespace-nowrap rounded-md bg-amber px-4 py-2 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
            >
              + Create Contact
            </Link>
          </div>
        </div>

        <FilterBar
          fields={fields}
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
      </div>

      <BulkDeleteBar count={selectedIds.size} onDelete={handleBulkDelete} onClear={() => { setSelectedIds(new Set()); setSelectionMode(false); }} deleting={bulkDeleting} />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
          <p className="font-serif text-lg text-fg">
            {query || filters.length > 0 ? "No contacts match your search or filters" : "No contacts yet"}
          </p>
          <p className="max-w-sm text-sm text-ink-soft">
            {query || filters.length > 0
              ? "Try a different search term, or remove a filter."
              : "Contacts you convert from leads, or add directly, show up here."}
          </p>
          {!(query || filters.length > 0) && (
            <Link
              href="/dashboard/contacts/new"
              className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              + Create Contact
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Selection and actions">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={filtered.length > 0 && filtered.every((row) => selectedIds.has(row.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-slate"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Contact Name</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Contact Owner</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((contact) => (
                  <tr
                    key={contact.id}
                    data-record-row={contact.id}
                    onClick={(event) => {
                      if (!selectionMode) return;
                      const target = event.target as HTMLElement;
                      if (target.closest('button[aria-label="Record actions"]')) return;
                      event.preventDefault();
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(contact.id)) next.delete(contact.id); else next.add(contact.id);
                        return next;
                      });
                    }}
                    onDoubleClick={() => { if (!selectionMode) router.push(`/dashboard/contacts/${contact.id}`); }}
                    title="Double-click to open contact details"
                    className={`group cursor-pointer border-b border-line last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)] ${
                      removingId === contact.id ? "animate-row-remove" : ""
                    } ${highlightId === contact.id ? "animate-row-highlight" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {selectionMode && <SelectionIndicator selected={selectedIds.has(contact.id)} />}
                        <RecordActionsMenu
                        onEdit={() => router.push(`/dashboard/contacts/${contact.id}?edit=1`)}
                        onDelete={() => handleDelete(contact)}
                        onSelect={() => setSelectionMode(true)}
                        recordId={contact.id}
                      />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        onClick={(event) => {
                          if (selectionMode) {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedIds((current) => {
                              const next = new Set(current);
                              const id = contact.id;
                              if (next.has(id)) next.delete(id); else next.add(id);
                              return next;
                            });
                          }
                        }}
                        className="font-medium text-slate hover:underline"
                      >
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{contact.account_name || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{contact.email || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{contact.phone || "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{contact.contact_owner_name ?? "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
            <span>Total Records {filtered.length}</span>
            <div className="flex items-center gap-3">
              <span>
                {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded border border-line px-2 py-1 disabled:opacity-40"
              >
                ‹
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded border border-line px-2 py-1 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
