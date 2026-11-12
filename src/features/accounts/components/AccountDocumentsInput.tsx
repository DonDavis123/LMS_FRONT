"use client";

import { Plus, X } from "lucide-react";
import { inputClass } from "@/shared/components/FormLayout";
import { normalizeDocumentUrl } from "@/features/accounts/utils/documentUrl";
import type { AccountDocumentPayload } from "@/features/accounts/types/account.types";

/** One editable row of the create form; `key` only identifies the row in the list. */
export interface DocumentDraft {
  key: string;
  name: string;
  url: string;
}

let draftCounter = 0;
export function newDocumentDraft(): DocumentDraft {
  return { key: `new-doc-${++draftCounter}`, name: "", url: "" };
}

/**
 * Turns the form rows into the payload sent with the new account.
 * Rows left completely empty are ignored; a half-filled row is an error.
 */
export function buildDocumentPayload(
  drafts: DocumentDraft[]
): { documents: AccountDocumentPayload[]; error: string | null } {
  const documents: AccountDocumentPayload[] = [];

  for (const draft of drafts) {
    const name = draft.name.trim();
    const url = normalizeDocumentUrl(draft.url);
    if (!name && !url) continue;
    if (!name || !url) {
      return { documents: [], error: "Each document needs both a name and a URL." };
    }
    documents.push({ name, url });
  }

  return { documents, error: null };
}

interface AccountDocumentsInputProps {
  drafts: DocumentDraft[];
  onChange: (drafts: DocumentDraft[]) => void;
}

/** Controlled "document name + URL" rows with an Add button, for the create form. */
export default function AccountDocumentsInput({ drafts, onChange }: AccountDocumentsInputProps) {
  function patch(key: string, change: Partial<DocumentDraft>) {
    onChange(drafts.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));
  }

  return (
    <div className="sm:col-span-2">
      {drafts.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No documents added. Click Add to attach a document name and link.
        </p>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div key={draft.key} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={draft.name}
                  onChange={(e) => patch(draft.key, { name: e.target.value })}
                  onKeyDown={(e) => {
                    // Enter must not submit the whole account form from here.
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  maxLength={255}
                  className={inputClass}
                  placeholder="Document name"
                  aria-label="Document name"
                />
                <input
                  value={draft.url}
                  onChange={(e) => patch(draft.key, { url: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  maxLength={2000}
                  className={inputClass}
                  placeholder="https://example.com/document.pdf"
                  aria-label="Document URL"
                  inputMode="url"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(drafts.filter((row) => row.key !== draft.key))}
                className="mt-0.5 rounded-md p-2.5 text-ink-soft hover:bg-paper hover:text-danger"
                aria-label="Remove document"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange([...drafts, newDocumentDraft()])}
        className="mt-3 flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper"
      >
        <Plus size={14} />
        Add
      </button>
    </div>
  );
}
