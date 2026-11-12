"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { AccountService } from "@/features/accounts/services/AccountService";
import type { AccountDocument } from "@/features/accounts/types/account.types";
import { normalizeDocumentUrl } from "@/features/accounts/utils/documentUrl";
import { inputClass } from "@/shared/components/FormLayout";
import { extractApiError } from "@/shared/utils/apiError";
import { confirmDelete } from "@/shared/utils/confirmDelete";

interface AccountDocumentsProps {
  accountId: string;
  /** Documents already returned with the account; avoids a second request. */
  initialDocuments?: AccountDocument[];
}

/** An unsaved row: either a new document (no `id`) or an existing one being edited. */
interface Draft {
  key: string;
  id?: string;
  name: string;
  url: string;
  error: string | null;
  saving: boolean;
}

let draftCounter = 0;
const newDraftKey = () => `draft-${++draftCounter}`;

export default function AccountDocuments({ accountId, initialDocuments }: AccountDocumentsProps) {
  const [documents, setDocuments] = useState<AccountDocument[]>(initialDocuments ?? []);
  const [loading, setLoading] = useState(initialDocuments === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDocuments !== undefined) return;
    let cancelled = false;
    AccountService.getDocuments(accountId)
      .then((rows) => {
        if (!cancelled) setDocuments(rows);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(extractApiError(error, "Couldn't load documents."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, initialDocuments]);

  function patchDraft(key: string, patch: Partial<Draft>) {
    setDrafts((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addDraft() {
    setDrafts((rows) => [...rows, { key: newDraftKey(), name: "", url: "", error: null, saving: false }]);
  }

  function editDocument(doc: AccountDocument) {
    setDrafts((rows) =>
      rows.some((row) => row.id === doc.id)
        ? rows
        : [...rows, { key: newDraftKey(), id: doc.id, name: doc.name, url: doc.url, error: null, saving: false }]
    );
  }

  function discardDraft(key: string) {
    setDrafts((rows) => rows.filter((row) => row.key !== key));
  }

  async function saveDraft(draft: Draft) {
    const name = draft.name.trim();
    const url = normalizeDocumentUrl(draft.url);

    if (!name) return patchDraft(draft.key, { error: "Enter a document name." });
    if (!url) return patchDraft(draft.key, { error: "Enter the document URL." });

    patchDraft(draft.key, { saving: true, error: null });
    setActionError(null);
    try {
      if (draft.id) {
        const saved = await AccountService.updateDocument(accountId, draft.id, { name, url });
        setDocuments((rows) => rows.map((row) => (row.id === saved.id ? saved : row)));
      } else {
        const saved = await AccountService.addDocument(accountId, { name, url });
        setDocuments((rows) => [...rows, saved]);
      }
      discardDraft(draft.key);
    } catch (error) {
      patchDraft(draft.key, {
        saving: false,
        error: extractApiError(error, "Couldn't save this document. Try again."),
      });
    }
  }

  async function removeDocument(doc: AccountDocument) {
    if (!(await confirmDelete(`Delete document "${doc.name}"?`))) return;
    setDeletingId(doc.id);
    setActionError(null);
    try {
      await AccountService.deleteDocument(accountId, doc.id);
      setDocuments((rows) => rows.filter((row) => row.id !== doc.id));
      setDrafts((rows) => rows.filter((row) => row.id !== doc.id));
    } catch (error) {
      setActionError(extractApiError(error, "Couldn't delete this document. Try again."));
    } finally {
      setDeletingId(null);
    }
  }

  const newDrafts = drafts.filter((draft) => !draft.id);
  const editingIds = new Set(drafts.filter((draft) => draft.id).map((draft) => draft.id));

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Documents</h3>
        <button
          type="button"
          onClick={addDraft}
          className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}
      {actionError && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="h-10 animate-shimmer rounded-md" />
      ) : (
        <div className="space-y-2">
          {documents.length === 0 && newDrafts.length === 0 && !loadError && (
            <p className="text-sm text-ink-soft">
              No documents yet. Click Add to attach a document name and link.
            </p>
          )}

          {documents.map((doc) => {
            const draft = drafts.find((row) => row.id === doc.id);
            if (editingIds.has(doc.id) && draft) {
              return <DraftRow key={draft.key} draft={draft} onChange={patchDraft} onSave={saveDraft} onCancel={discardDraft} />;
            }
            return (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{doc.name}</p>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate text-xs text-slate hover:underline"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate">{doc.url}</span>
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => editDocument(doc)}
                    className="rounded-md p-2 text-ink-soft hover:bg-paper hover:text-fg"
                    aria-label={`Edit ${doc.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc)}
                    disabled={deletingId === doc.id}
                    className="rounded-md p-2 text-danger hover:bg-danger-soft disabled:opacity-50"
                    aria-label={`Delete ${doc.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {newDrafts.map((draft) => (
            <DraftRow key={draft.key} draft={draft} onChange={patchDraft} onSave={saveDraft} onCancel={discardDraft} />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftRow({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  onChange: (key: string, patch: Partial<Draft>) => void;
  onSave: (draft: Draft) => void;
  onCancel: (key: string) => void;
}) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={draft.name}
          onChange={(e) => onChange(draft.key, { name: e.target.value })}
          maxLength={255}
          className={inputClass}
          placeholder="Document name"
          aria-label="Document name"
          autoFocus
        />
        <input
          value={draft.url}
          onChange={(e) => onChange(draft.key, { url: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(draft);
          }}
          maxLength={2000}
          className={inputClass}
          placeholder="https://example.com/document.pdf"
          aria-label="Document URL"
          inputMode="url"
        />
      </div>
      {draft.error && <p className="mt-2 text-sm text-danger">{draft.error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onCancel(draft.key)}
          disabled={draft.saving}
          className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface disabled:opacity-60"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={draft.saving}
          className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-2 disabled:opacity-60"
        >
          {draft.saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
