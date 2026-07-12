// Espejo en TypeScript de las variables CSS definidas en app/globals.css.
// Úsalo solo donde una clase de Tailwind no alcance (ej. props de color de
// una librería de gráficos). En JSX/TSX, preferir siempre las clases de
// utilidad (bg-void, text-secondary, etc.) sobre importar este objeto.
export const TOKENS = {
  void: "#0B0C0E",
  raised: "#141619",
  overlay: "#1C1F23",
  hairline: "#2A2E33",
  textPrimary: "#E8E6E1",
  textSecondary: "#9B9891",
  textTertiary: "#5F5D58",
  accent: "#A8935C",
  elevated: "#8B7355",
  critical: "#C4A76D",
} as const;

export function irccTone(value: number): { colorVar: string; label: string } {
  if (value < 40) return { colorVar: "var(--text-secondary)", label: "Estable" };
  if (value < 70) return { colorVar: "var(--signal-elevated)", label: "Elevado" };
  return { colorVar: "var(--signal-critical)", label: "Crítico" };
}

export const BIAS_LABELS: Record<string, string> = {
  time_between_bets: "Velocidad de decisión",
  loss_chasing: "Recuperación de pérdidas",
  decision_fatigue: "Fatiga de decisión",
  overconcentration: "Sobreconcentración",
};
