import type { Call, CreateCallPayload, UpdateCallPayload } from "@/features/calls/types/call.types";
import { DEFAULT_CALL_STATUS, DEFAULT_CALL_TYPE } from "@/features/calls/types/call.types";

/**
 * There's no `/calls/` endpoint on the backend yet, so this is kept
 * client-side (localStorage) for now — same async method shape
 * (`getX/createX/updateX/deleteX`) a real `apiClient`-backed service would
 * have, so swapping this for real HTTP calls later is a small, contained
 * change (only the inside of this file).
 */
const STORAGE_KEY = "crm.calls";
const isBrowser = () => typeof window !== "undefined";

function readAll(): Call[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Call[];
  } catch {
    return [];
  }
}

function writeAll(calls: Call[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(calls));
}

export const CallService = {
  async getCalls(): Promise<Call[]> {
    return [...readAll()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  async getCall(id: string): Promise<Call> {
    const call = readAll().find((c) => c.id === id);
    if (!call) throw new Error("Call not found");
    return call;
  },

  async createCall(payload: CreateCallPayload): Promise<Call> {
    const now = new Date().toISOString();
    const call: Call = {
      id: crypto.randomUUID(),
      subject: payload.subject,
      owner_id: payload.owner_id,
      owner_name: payload.owner_name ?? null,
      call_type: payload.call_type ?? DEFAULT_CALL_TYPE,
      call_status: payload.call_status ?? DEFAULT_CALL_STATUS,
      call_start_time: payload.call_start_time ?? null,
      call_duration_minutes: payload.call_duration_minutes ?? null,
      description: payload.description ?? null,
      lead_id: payload.lead_id ?? null,
      lead_name: payload.lead_name ?? null,
      contact_id: payload.contact_id ?? null,
      contact_name: payload.contact_name ?? null,
      account_id: payload.account_id ?? null,
      account_name: payload.account_name ?? null,
      created_at: now,
      updated_at: now,
    };
    writeAll([call, ...readAll()]);
    return call;
  },

  async updateCall(id: string, payload: UpdateCallPayload): Promise<Call> {
    const all = readAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Call not found");
    const updated: Call = { ...all[index], ...payload, updated_at: new Date().toISOString() };
    all[index] = updated;
    writeAll(all);
    return updated;
  },

  async deleteCall(id: string): Promise<string> {
    writeAll(readAll().filter((c) => c.id !== id));
    return "Call deleted successfully";
  },
};
