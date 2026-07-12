// Tipos de dominio de Aethelgard, alineados 1:1 con supabase/migrations/0001_init.sql.
// El tipo `Database` es un genérico simplificado a mano; para producción se
// recomienda generarlo automáticamente con `supabase gen types typescript`
// una vez el esquema esté desplegado, y reemplazar este archivo.

export type SourceMarket = "polymarket" | "kalshi";
export type PositionSide = "yes" | "no";
export type PositionStatus =
  | "active"
  | "closed_won"
  | "closed_lost"
  | "closed_void";
export type BiasType =
  | "time_between_bets"
  | "loss_chasing"
  | "decision_fatigue"
  | "overconcentration";

export interface Profile {
  id: string;
  display_name: string;
  risk_tolerance_level: number;
  max_position_pct_bankroll: number;
  max_correlated_exposure_pct: number;
  ircc_alert_threshold: number;
  session_fatigue_minutes_cap: number;
  created_at: string;
  updated_at: string;
}

export interface MarketPosition {
  id: string;
  user_id: string;
  source_market: SourceMarket;
  source_market_id: string;
  market_question: string;
  stake_amount: number;
  entry_price: number;
  side: PositionSide;
  status: PositionStatus;
  related_ai_thesis_id: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface EmotionalRiskLog {
  id: string;
  user_id: string;
  related_position_id: string | null;
  bias_type: BiasType;
  severity_score: number;
  fatigue_index_snapshot: number | null;
  ircc_snapshot: number;
  detail_payload: Record<string, unknown>;
  created_at: string;
}

export interface AiAuditThesis {
  id: string;
  source_market_id: string;
  source_market: SourceMarket;
  base_probability: number;
  favor_premises: string[];
  blind_spots: string[];
  tail_scenarios: string[];
  model_version: string;
  generated_at: string;
  expires_at: string;
}

// Genérico mínimo compatible con el tipado de @supabase/supabase-js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
