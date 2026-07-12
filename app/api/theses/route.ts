import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { AiAuditThesis, SourceMarket } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";
const CACHE_TTL_MINUTES = 15;

interface RequestBody {
  marketId: string;
  marketQuestion: string;
  sourceMarket: SourceMarket;
}

interface ThesisShape {
  probabilidad_base: number;
  premisas_favor: string[];
  puntos_ciegos: string[];
  escenarios_cola: string[];
}

function isValidThesis(value: unknown): value is ThesisShape {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.probabilidad_base === "number" &&
    v.probabilidad_base >= 0 &&
    v.probabilidad_base <= 1 &&
    Array.isArray(v.premisas_favor) &&
    v.premisas_favor.every((p) => typeof p === "string") &&
    Array.isArray(v.puntos_ciegos) &&
    v.puntos_ciegos.length > 0 &&
    v.puntos_ciegos.every((p) => typeof p === "string") &&
    Array.isArray(v.escenarios_cola) &&
    v.escenarios_cola.every((p) => typeof p === "string")
  );
}

const SYSTEM_PROMPT = `Eres el motor de auditoría de Aethelgard, una plataforma de inteligencia
conductual para mercados de predicción. Tu única salida debe ser un objeto
JSON válido, sin texto adicional, sin markdown, sin backticks, que siga
EXACTAMENTE este esquema:

{
  "probabilidad_base": number (0 a 1),
  "premisas_favor": string[] (3 a 5 premisas fácticas o estructurales concretas),
  "puntos_ciegos": string[] (2 a 4 supuestos frágiles o límites reales del
    análisis — este campo es obligatorio y nunca puede quedar vacío, es el
    corazón del producto),
  "escenarios_cola": string[] (1 a 3 escenarios de baja probabilidad y alto
    impacto que invalidarían la tesis)
}

No uses lenguaje de venta ni de urgencia. Sé específico del mercado dado,
nunca genérico. Los puntos ciegos deben ser límites reales del propio
razonamiento, no advertencias legales genéricas tipo "esto no es consejo
financiero".`;

export async function POST(req: Request) {
  const body = (await req.json()) as RequestBody;

  if (!body?.marketId || !body?.marketQuestion || !body?.sourceMarket) {
    return NextResponse.json(
      { error: "marketId, marketQuestion y sourceMarket son requeridos." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  // 1. Reutiliza una tesis en caché si existe y no ha expirado.
  const { data: cached } = await serviceClient
    .from("ai_audit_theses")
    .select("*")
    .eq("source_market_id", body.marketId)
    .eq("source_market", body.sourceMarket)
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle<AiAuditThesis>();

  if (cached) {
    return NextResponse.json({ thesis: cached });
  }

  // 2. Genera una tesis nueva en JSON Mode, con un reintento de corrección
  //    si la primera respuesta no valida contra el esquema.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async function generate(retry: boolean): Promise<ThesisShape> {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: retry
            ? `Tu respuesta anterior no era JSON válido según el esquema. Responde ÚNICAMENTE con el objeto JSON, sin ningún texto extra, para el mercado: "${body.marketQuestion}"`
            : `Genera la tesis de auditoría para el mercado: "${body.marketQuestion}"`,
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      if (!retry) return generate(true);
      throw new Error("El modelo no devolvió JSON válido tras un reintento.");
    }

    if (!isValidThesis(parsed)) {
      if (!retry) return generate(true);
      throw new Error("La respuesta no cumple el esquema requerido.");
    }

    return parsed;
  }

  let thesis: ThesisShape;
  try {
    thesis = await generate(false);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando la tesis." },
      { status: 502 }
    );
  }

  // 3. Persiste la tesis usando el service role (la política de la tabla
  //    solo permite insertar desde ahí — ver supabase/migrations/0001_init.sql).
  const expiresAt = new Date(
    Date.now() + CACHE_TTL_MINUTES * 60 * 1000
  ).toISOString();

  const { data: inserted, error: insertError } = await serviceClient
    .from("ai_audit_theses")
    .insert({
      source_market_id: body.marketId,
      source_market: body.sourceMarket,
      base_probability: thesis.probabilidad_base,
      favor_premises: thesis.premisas_favor,
      blind_spots: thesis.puntos_ciegos,
      tail_scenarios: thesis.escenarios_cola,
      model_version: MODEL,
      expires_at: expiresAt,
    })
    .select("*")
    .single<AiAuditThesis>();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "No se pudo guardar la tesis." },
      { status: 500 }
    );
  }

  return NextResponse.json({ thesis: inserted });
}
