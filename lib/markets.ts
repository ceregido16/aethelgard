import type { SourceMarket } from "@/lib/types";

/**
 * Lista curada de mercados disponibles para evaluar. En producción esto
 * se sustituye por la lectura en vivo de `market_snapshots`, alimentada
 * por el worker de ingesta WebSocket descrito en la Sección 3.5 del PRD
 * (apps/ingestion-worker, fuera del alcance de este slice del MVP).
 */
export interface CandidateMarket {
  id: string;
  question: string;
  source: SourceMarket;
}

export const AVAILABLE_MARKETS: CandidateMarket[] = [
  {
    id: "sp500-ath-2026",
    question: "¿Cerrará el S&P 500 en máximo histórico antes de fin de año?",
    source: "kalshi",
  },
  {
    id: "fed-rate-cut-q3",
    question: "¿Recortará la Fed las tasas de interés en el próximo FOMC?",
    source: "kalshi",
  },
  {
    id: "btc-140k-2026",
    question: "¿Superará el Bitcoin los $140,000 antes de septiembre?",
    source: "polymarket",
  },
];
