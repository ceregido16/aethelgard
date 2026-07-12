"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createPosition } from "@/lib/actions/positions";
import { AVAILABLE_MARKETS, type CandidateMarket } from "@/lib/markets";
import { StepDots } from "@/components/positions/StepDots";
import type { AiAuditThesis, PositionSide } from "@/lib/types";

type Stage = "pick" | "generating" | "wizard" | "submitting";

export function NewPositionFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("pick");
  const [market, setMarket] = useState<CandidateMarket | null>(null);
  const [side, setSide] = useState<PositionSide>("yes");
  const [stake, setStake] = useState<string>("200");
  const [thesis, setThesis] = useState<AiAuditThesis | null>(null);
  const [reflectiveQuestion, setReflectiveQuestion] = useState<string>("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  async function buildReflectiveQuestion(chosenSide: PositionSide, stakeAmount: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Antes de confirmar, tómate un momento: ¿esta decisión se sostiene igual de bien si asumes que estás equivocado?";

    const { data: recent } = await supabase
      .from("market_positions")
      .select("side, opened_at, stake_amount")
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false })
      .limit(10);

    if (!recent || recent.length === 0) {
      return "Esta es tu primera posición registrada en Aethelgard. ¿Ya revisaste tus umbrales de riesgo en Ajustes?";
    }

    let sameSideStreak = 0;
    for (const p of recent) {
      if (p.side === chosenSide) sameSideStreak += 1;
      else break;
    }

    const lastOpened = new Date(recent[0].opened_at).getTime();
    const minutesSinceLast = (Date.now() - lastOpened) / 60000;

    const avgStake =
      recent.reduce((sum: number, p: { stake_amount: number }) => sum + Number(p.stake_amount), 0) /
      recent.length;

    if (sameSideStreak >= 3) {
      return `Tus últimas ${sameSideStreak} posiciones asumieron el mismo lado del mercado (${chosenSide === "yes" ? "SÍ" : "NO"}). ¿Has buscado activamente el argumento contrario antes de esta?`;
    }
    if (minutesSinceLast < 15) {
      return `Han pasado solo ${Math.max(1, Math.round(minutesSinceLast))} minutos desde tu última posición. ¿Le dedicaste a la Capa 2 el mismo tiempo que a las anteriores?`;
    }
    if (avgStake > 0 && stakeAmount > avgStake * 1.5) {
      return `El monto que vas a comprometer ($${stakeAmount}) es notablemente mayor a tu promedio reciente ($${Math.round(avgStake)}). ¿Sigue siendo una decisión deliberada, o una reacción a algo puntual?`;
    }
    return "Antes de confirmar, tómate un momento: ¿esta tesis se sostiene igual de bien si asumes que estás equivocado?";
  }

  async function handlePickMarket(m: CandidateMarket) {
    setMarket(m);
    setStage("generating");
    setError(null);

    const [thesisRes, question] = await Promise.all([
      fetch("/api/theses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: m.id,
          marketQuestion: m.question,
          sourceMarket: m.source,
        }),
      }).then((r) => r.json()),
      buildReflectiveQuestion(side, Number(stake) || 0),
    ]);

    if (thesisRes.error) {
      setError(thesisRes.error);
      setStage("pick");
      return;
    }

    setThesis(thesisRes.thesis as AiAuditThesis);
    setReflectiveQuestion(question);
    setStep(1);
    setStage("wizard");
  }

  async function handleConfirm() {
    if (!market || !thesis) return;
    setStage("submitting");
    const result = await createPosition({
      sourceMarket: market.source,
      sourceMarketId: market.id,
      marketQuestion: market.question,
      stakeAmount: Number(stake),
      entryPrice: thesis.base_probability,
      side,
      relatedAiThesisId: thesis.id,
    });

    if (result.error) {
      setError(result.error);
      setStage("wizard");
      return;
    }

    router.push("/positions");
  }

  if (stage === "pick" || stage === "generating") {
    return (
      <div>
        <button
          onClick={() => router.push("/positions")}
          className="text-xs flex items-center gap-1.5 mb-8 text-text-tertiary"
        >
          <ArrowLeft size={13} /> Volver a posiciones
        </button>

        <p className="text-xs uppercase tracking-widest mb-2 text-text-tertiary">
          Selecciona un mercado
        </p>
        <h1 className="text-2xl font-medium mb-8 text-text-primary">
          Nueva posición
        </h1>

        <div className="max-w-2xl mb-8">
          {AVAILABLE_MARKETS.map((m) => (
            <button
              key={m.id}
              disabled={stage === "generating"}
              onClick={() => handlePickMarket(m)}
              className="w-full text-left py-5 flex items-center justify-between gap-6 border-b border-hairline disabled:opacity-50"
            >
              <div>
                <p className="text-sm mb-1.5 text-text-primary">{m.question}</p>
                <p className="text-xs text-text-tertiary">
                  {m.source === "kalshi" ? "Kalshi" : "Polymarket"}
                </p>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" />
            </button>
          ))}
        </div>

        <div className="max-w-2xl flex items-end gap-6 mb-4">
          <div>
            <label className="block text-xs text-text-tertiary mb-2">Lado</label>
            <div className="flex gap-2">
              {(["yes", "no"] as PositionSide[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className="px-3 py-2 rounded text-sm border"
                  style={{
                    borderColor: "var(--border-hairline)",
                    background: side === s ? "var(--surface-raised)" : "transparent",
                    color:
                      side === s ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {s === "yes" ? "SÍ" : "NO"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-2" htmlFor="stake">
              Monto (USD)
            </label>
            <input
              id="stake"
              type="number"
              min={1}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-32 bg-raised border border-hairline rounded px-3 py-2 text-sm font-mono text-text-primary outline-none"
            />
          </div>
        </div>

        {stage === "generating" && (
          <p className="text-sm text-text-secondary mt-4">
            Generando la tesis de auditoría para {market?.question}…
          </p>
        )}
        {error && <p className="text-sm text-critical mt-4">{error}</p>}
      </div>
    );
  }

  if (!market || !thesis) return null;

  return (
    <div>
      <button
        onClick={() => {
          setStage("pick");
          setThesis(null);
          setMarket(null);
        }}
        className="text-xs flex items-center gap-1.5 mb-8 text-text-tertiary"
      >
        <ArrowLeft size={13} /> Elegir otro mercado
      </button>

      <p className="text-xs uppercase tracking-widest mb-2 text-text-tertiary">
        Árbol de Decisión Transparente
      </p>
      <h1 className="text-xl font-medium mb-6 max-w-2xl text-text-primary">
        {market.question}
      </h1>

      <StepDots step={step} />

      <div className="max-w-2xl rounded p-7 border border-hairline bg-raised">
        {step === 1 && (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs uppercase tracking-widest text-text-tertiary">
                Capa 1 · La tesis base
              </p>
              <p className="font-mono text-lg tabular-nums text-text-primary">
                {(thesis.base_probability * 100).toFixed(0)}%
              </p>
            </div>
            <ul className="space-y-3">
              {thesis.favor_premises.map((p, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed flex gap-3 text-text-primary"
                >
                  <Circle
                    size={5}
                    fill="var(--text-tertiary)"
                    className="mt-2 shrink-0 text-text-tertiary"
                  />
                  {p}
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-xs uppercase tracking-widest mb-5 text-text-tertiary">
              Capa 2 · Puntos ciegos del modelo
            </p>
            <ul className="space-y-3">
              {thesis.blind_spots.map((p, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed flex gap-3 text-text-primary"
                >
                  <Circle
                    size={5}
                    fill="var(--signal-elevated)"
                    className="mt-2 shrink-0"
                    style={{ color: "var(--signal-elevated)" }}
                  />
                  {p}
                </li>
              ))}
            </ul>
            {thesis.tail_scenarios.length > 0 && (
              <div className="mt-6 pt-5 border-t border-hairline">
                <p className="text-xs uppercase tracking-widest mb-3 text-text-tertiary">
                  Escenarios de cola
                </p>
                <ul className="space-y-2">
                  {thesis.tail_scenarios.map((s, i) => (
                    <li key={i} className="text-sm leading-relaxed text-text-secondary">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-xs uppercase tracking-widest mb-5 text-text-tertiary">
              Capa 3 · Espejo del sesgo de confirmación
            </p>
            <p className="text-base leading-relaxed text-text-primary">
              {reflectiveQuestion}
            </p>
          </>
        )}

        {error && <p className="text-sm text-critical mt-4">{error}</p>}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-hairline">
          <p className="text-xs text-text-tertiary">Paso {step} de 3</p>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="text-sm px-4 py-2 rounded flex items-center gap-2 border border-hairline text-text-primary"
            >
              He leído esto, continuar <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={stage === "submitting"}
              className="text-sm px-4 py-2 rounded flex items-center gap-2 bg-accent text-void disabled:opacity-60"
            >
              {stage === "submitting" ? "Registrando…" : "Confirmar posición"}
              {stage !== "submitting" && <Check size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
