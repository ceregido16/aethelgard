"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type AuthActionState } from "@/lib/actions/auth";
import { ShieldHalf } from "lucide-react";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/guardian";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <ShieldHalf size={18} className="text-accent" />
          <span className="text-sm tracking-wide text-text-primary">
            Aethelgard
          </span>
        </div>

        <h1 className="text-xl font-medium text-text-primary mb-1">
          Inicia sesión
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          El juicio, protegido.
        </p>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="block text-xs text-text-tertiary mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-raised border border-hairline rounded px-3 py-2.5 text-sm text-text-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-raised border border-hairline rounded px-3 py-2.5 text-sm text-text-primary outline-none"
            />
          </div>

          {state.error && (
            <p className="text-sm text-critical">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-accent text-void text-sm font-medium rounded px-3 py-2.5 disabled:opacity-60"
          >
            {pending ? "Verificando…" : "Entrar"}
          </button>
        </form>

        <p className="text-sm text-text-secondary mt-8 text-center">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="text-text-primary underline">
            Crear una
          </Link>
        </p>
      </div>
    </main>
  );
}
