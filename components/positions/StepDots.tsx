import { Check } from "lucide-react";

export function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full text-xs font-mono"
            style={{
              width: 22,
              height: 22,
              color: n <= step ? "var(--surface-void)" : "var(--text-tertiary)",
              background: n <= step ? "var(--accent-functional)" : "transparent",
              border: n <= step ? "none" : "1px solid var(--border-hairline)",
            }}
          >
            {n < step ? <Check size={12} /> : n}
          </div>
          {n < 3 && (
            <div
              style={{
                width: 32,
                height: 1,
                background:
                  n < step ? "var(--accent-functional)" : "var(--border-hairline)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
