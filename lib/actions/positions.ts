"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PositionSide, SourceMarket } from "@/lib/types";

export interface CreatePositionInput {
  sourceMarket: SourceMarket;
  sourceMarketId: string;
  marketQuestion: string;
  stakeAmount: number;
  entryPrice: number;
  side: PositionSide;
  relatedAiThesisId: string | null;
}

export interface CreatePositionResult {
  error: string | null;
}

export async function createPosition(
  input: CreatePositionInput
): Promise<CreatePositionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado." };
  }

  if (input.stakeAmount <= 0) {
    return { error: "El monto debe ser mayor a cero." };
  }

  // El insert dispara automáticamente trg_evaluate_behavioral_risk en
  // Postgres (ver supabase/migrations/0001_init.sql), que evalúa el
  // Detector de Velocidad Temporal y registra el evento correspondiente
  // en emotional_risk_logs si aplica — no hay ninguna lógica de riesgo
  // duplicada aquí en el cliente ni en esta acción.
  const { error } = await supabase.from("market_positions").insert({
    user_id: user.id,
    source_market: input.sourceMarket,
    source_market_id: input.sourceMarketId,
    market_question: input.marketQuestion,
    stake_amount: input.stakeAmount,
    entry_price: input.entryPrice,
    side: input.side,
    related_ai_thesis_id: input.relatedAiThesisId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/positions");
  revalidatePath("/guardian");
  return { error: null };
}
