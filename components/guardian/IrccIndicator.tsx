"use client";

import { irccTone } from "@/lib/design-tokens";

export function IrccIndicator({ value }: { value: number }) {
  const tone = irccTone(value);

  return (
    <div className="text-right">
      <p
        className="font-mono text-4xl font-medium tabular-nums transition-colors duration-500"
        style={{ color: tone.colorVar }}
      >
        {value}
      </p>
      <p className="text-xs mt-1 text-text-secondary">{tone.label}</p>
    </div>
  );
}
