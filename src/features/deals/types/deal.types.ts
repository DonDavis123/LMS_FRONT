/**
 * Mirrors the backend's /api/deals/ contract 1:1. Money is always a string
 * (`"100000.00"`) — never parse it into a float for arithmetic; the server
 * sends every total.
 */

export type DealStage = "New" | "Quotation Sent" | "Negotiation" | "Won" | "Lost";

export interface Deal {
  id: string;
  name: string;
  amount: string;
  expected_close_date: string | null; // YYYY-MM-DD
  stage: DealStage;
  probability: number; // 0-100
  owner_id: string;
  owner_name: string | null;
  account_id: string | null;
  account_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
  source_lead_id: string | null;
  source_lead_name: string | null;
  lead_source: string | null;
  description: string | null;
  lost_reason: string | null;
  closed_at: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

/** At least one of `account_id` / `contact_id` is required by the backend. */
export interface CreateDealPayload {
  name: string;
  amount: string;
  expected_close_date?: string | null;
  stage?: DealStage;
  probability?: number;
  owner_id: string;
  account_id?: string | null;
  contact_id?: string | null;
  description?: string | null;
}

export type UpdateDealPayload = Partial<CreateDealPayload>;

/** `lost_reason` is required by the backend when `stage` is `"Lost"`. */
export interface MoveDealPayload {
  stage: DealStage;
  probability?: number;
  lost_reason?: string;
}

/** A trimmed Deal, as shown on a board card. */
export interface BoardCard {
  id: string;
  name: string;
  amount: string;
  expected_close_date: string | null;
  probability: number;
  owner_id: string;
  owner_name: string | null;
  account_id: string | null;
  account_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
}

export interface BoardColumn {
  stage: DealStage;
  default_probability: number;
  count: number;
  total_amount: string;
  weighted_amount: string;
  has_more: boolean;
  deals: BoardCard[];
}

export interface BoardResponse {
  stages: BoardColumn[];
}

export interface BoardParams {
  owner_id?: string;
  expected_close_from?: string;
  expected_close_to?: string;
  search?: string;
  closed_within_days?: number;
}

export interface ForecastStageRow {
  stage: DealStage;
  count: number;
  total_amount: string;
  weighted_amount: string;
}

export interface ForecastMonthRow {
  month: string | null;
  total_amount: string;
  weighted_amount: string;
}

export interface Forecast {
  open_pipeline: string;
  weighted_forecast: string;
  won_this_month: string;
  lost_this_month: string;
  open_deal_count: number;
  by_stage: ForecastStageRow[];
  by_month: ForecastMonthRow[];
}

export interface ForecastParams {
  owner_id?: string;
  tz?: string;
}
