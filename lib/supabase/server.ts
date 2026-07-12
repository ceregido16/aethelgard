import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Lee/escribe cookies de sesión para mantener al usuario
 * autenticado entre requests. Sigue operando bajo RLS (clave anónima),
 * pero con la identidad del usuario ya resuelta desde la cookie.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se puede ignorar si setAll se llama desde un Server Component:
            // el middleware ya se encarga de refrescar la sesión.
          }
        },
      },
    }
  );
}

/**
 * Cliente con service role — SOLO para uso en el servidor (route handlers
 * de confianza), nunca importado desde un Client Component. Se salta RLS
 * deliberadamente para las dos operaciones que el propio esquema restringe
 * a `service_role`: insertar en ai_audit_theses e insertar en
 * emotional_risk_logs (ver supabase/migrations/0001_init.sql).
 */
export function createServiceRoleClient() {
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
