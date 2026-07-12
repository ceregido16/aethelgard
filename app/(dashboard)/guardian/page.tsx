import { createClient } from "@/lib/supabase/server";
import { GuardianView } from "@/components/guardian/GuardianView";
import type { EmotionalRiskLog, Profile } from "@/lib/types";

export default async function GuardianPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // El middleware ya protege esta ruta; esto es una salvaguarda adicional.
    return null;
  }

  const [{ data: profile }, { data: logs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("emotional_risk_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<EmotionalRiskLog[]>(),
  ]);

  const initialIrcc = logs?.[0]?.ircc_snapshot ?? 0;
  const alertThreshold = profile?.ircc_alert_threshold ?? 60;

  return (
    <GuardianView
      userId={user.id}
      initialIrcc={initialIrcc}
      initialLogs={logs ?? []}
      alertThreshold={alertThreshold}
    />
  );
}
