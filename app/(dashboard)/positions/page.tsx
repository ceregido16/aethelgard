import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PositionsList } from "@/components/positions/PositionsList";
import type { MarketPosition } from "@/lib/types";

export default async function PositionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: positions } = await supabase
    .from("market_positions")
    .select("*")
    .eq("user_id", user.id)
    .order("opened_at", { ascending: false })
    .returns<MarketPosition[]>();

  return (
    <div>
      <header className="flex items-center justify-between pb-6 mb-8 border-b border-hairline">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1 text-text-tertiary">
            Aethelgard · Posiciones
          </p>
          <h1 className="text-2xl font-medium text-text-primary">
            Historial de mercado
          </h1>
        </div>
        <Link
          href="/positions/new"
          className="text-sm px-4 py-2 rounded flex items-center gap-2 bg-accent text-void"
        >
          Abrir nueva posición <ArrowRight size={14} />
        </Link>
      </header>

      <PositionsList positions={positions ?? []} />
    </div>
  );
}
