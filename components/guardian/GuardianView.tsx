"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BIAS_LABELS } from "@/lib/design-tokens";
import { IrccIndicator } from "@/components/guardian/IrccIndicator";
import type { EmotionalRiskLog } from "@/lib/types";

interface Props {
  userId: string;
  initialIrcc: number;
  initialLogs: EmotionalRiskLog[];
  alertThreshold: number;
}

export function GuardianView({
  userId,
  initialIrcc,
  initialLogs,
  alertThreshold,
}: Props) {
  const [ircc, setIrcc] = useState(initialIrcc);
  const [logs, setLogs] = useState(initialLogs);

  useEffect(() => {
    const supabase = createClient();

    // El Guardián corre server-side (trigger PL/pgSQL sobre market_positions).
    // Esta suscripción solo refleja en vivo lo que el motor ya detectó,
    // nunca calcula riesgo en el cliente.
    const channel = supabase
      .channel(`guardian-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emotional_risk_logs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const log = payload.new as EmotionalRiskLog;
          setLogs((prev) => [log, ...prev].slice(0, 6));
          setIrcc(log.ircc_snapshot);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div>
      <header className="flex items-baseline justify-between pb-6 mb-8 border-b border-hairline">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1 text-text-tertiary">
            Aethelgard · Guardian
          </p>
          <h1 className="text-2xl font-medium text-text-primary">
            Índice de Riesgo Conductual
          </h1>
        </div>
        <IrccIndicator value={ircc} />
      </header>

      {ircc >= alertThreshold && (
        <div className="rounded p-6 mb-8 max-w-2xl border border-hairline bg-raised">
          <p className="text-sm leading-relaxed text-text-primary">
            Tu actividad reciente muestra un patrón que conviene revisar. No
            es necesariamente un error — algunos mercados exigen decisiones
            rápidas — pero antes de tu próxima posición vale la pena
            confirmar que leíste completamente la Capa 2 de la última tesis
            consultada.
          </p>
        </div>
      )}

      <div className="max-w-2xl">
        <h2 className="text-xs uppercase tracking-widest mb-4 text-text-tertiary">
          Eventos recientes
        </h2>
        <ul className="border-t border-hairline">
          {logs.length === 0 && (
            <li className="py-4 text-sm text-text-secondary">
              Sin eventos registrados todavía. Aparecerán aquí en cuanto
              abras tu primera posición.
            </li>
          )}
          {logs.map((log) => (
            <li
              key={log.id}
              className="py-4 flex items-center justify-between border-b border-hairline"
            >
              <div className="flex items-center gap-3">
                <Activity size={14} className="text-text-tertiary" />
                <span className="text-sm text-text-primary">
                  {BIAS_LABELS[log.bias_type] ?? log.bias_type}
                </span>
              </div>
              <span className="font-mono text-sm tabular-nums text-text-secondary">
                {log.severity_score}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
