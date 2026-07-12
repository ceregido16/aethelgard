import { TrendingDown, TrendingUp } from "lucide-react";
import type { MarketPosition } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function PositionsList({
  positions,
}: {
  positions: MarketPosition[];
}) {
  if (positions.length === 0) {
    return (
      <p className="text-sm text-text-secondary max-w-2xl">
        Todavía no tienes posiciones registradas. Ábrelas desde el botón de
        arriba para que el Guardián empiece a analizar tu comportamiento.
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      {positions.map((p) => (
        <div
          key={p.id}
          className="py-5 flex items-start justify-between gap-6 border-b border-hairline"
        >
          <div className="flex-1">
            <p className="text-sm mb-1.5 text-text-primary">
              {p.market_question}
            </p>
            <p className="text-xs text-text-tertiary">
              {p.source_market === "kalshi" ? "Kalshi" : "Polymarket"} ·{" "}
              {formatDate(p.opened_at)} · lado{" "}
              {p.side === "yes" ? "SÍ" : "NO"} · entrada{" "}
              {(p.entry_price * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className="font-mono text-sm tabular-nums"
              style={{
                color:
                  p.status === "closed_lost"
                    ? "var(--text-secondary)"
                    : "var(--text-primary)",
                fontWeight: p.status === "closed_lost" ? 400 : 500,
              }}
            >
              {p.status === "closed_lost" ? "−" : ""}${p.stake_amount}
            </p>
            <p className="text-xs mt-1 flex items-center gap-1 justify-end text-text-tertiary">
              {p.status === "active" && "Activa"}
              {p.status === "closed_won" && (
                <>
                  <TrendingUp size={11} /> Cerrada — ganada
                </>
              )}
              {p.status === "closed_lost" && (
                <>
                  <TrendingDown size={11} /> Cerrada — perdida
                </>
              )}
              {p.status === "closed_void" && "Anulada"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
