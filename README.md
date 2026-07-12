# Aethelgard

MVP funcional: Next.js 14 (App Router) + Supabase (Postgres, Auth, Realtime)
+ Anthropic API para la generación de tesis de auditoría. Implementa el
Guardian (detector de riesgo conductual en vivo) y el Árbol de Decisión
Transparente de tres capas descritos en el PRD.

## Qué es real y qué es un stand-in

Este es código de producción, no una maqueta: auth real contra Supabase,
RLS en cada tabla, un trigger PL/pgSQL que corre en Postgres (no en el
cliente), y llamadas reales a la API de Anthropic en JSON Mode con
validación de esquema y reintento.

Dos piezas están simplificadas deliberadamente para este slice del MVP,
señaladas en el código con comentarios:

- **`lib/markets.ts`** — lista curada de 3 mercados en vez del worker de
  ingesta WebSocket contra Polymarket/Kalshi (Sección 3.5 del PRD). Sustituir
  esta lista por una consulta a una tabla `market_snapshots` alimentada por
  ese worker es el siguiente paso natural.
- **El trigger SQL** implementa el Detector de Velocidad Temporal completo.
  Los otros tres detectores (loss-chasing, fatiga, sobreconcentración) siguen
  el mismo patrón y quedan documentados como siguiente iteración en
  `supabase/migrations/0001_init.sql`.

## Requisitos

- Node.js 18.18 o superior
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito alcanza)
- Una clave de API de [Anthropic](https://console.anthropic.com)

## Puesta en marcha

### 1. Crear el proyecto Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y pega el contenido completo de
   `supabase/migrations/0001_init.sql`. Ejecútalo.
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (mantenla secreta,
     nunca la expongas al cliente)

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena las cuatro variables: las tres de Supabase del paso anterior, más
`ANTHROPIC_API_KEY` con tu clave de la consola de Anthropic.

### 3. Instalar y correr en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. Te redirige a `/login` si no hay sesión.
Crea una cuenta desde `/signup` — esto inserta automáticamente tu fila en
`profiles` con los valores de riesgo por defecto (puedes ajustarlos
directamente en Supabase Table Editor por ahora; una pantalla de Ajustes
en la interfaz es el siguiente paso natural fuera de este slice).

### 4. Probar el flujo completo

1. En **Posiciones**, pulsa **Abrir nueva posición**.
2. Elige un mercado, lado y monto.
3. Se genera la tesis vía Anthropic (Capa 1/2/3) — la primera vez tarda
   unos segundos; llamadas siguientes al mismo mercado usan la caché de
   15 minutos en `ai_audit_theses`.
4. Recorre las tres capas y confirma. Esto inserta la fila en
   `market_positions`, lo que dispara el trigger de Postgres.
5. Abre **Guardian**: si abriste una segunda posición mucho más rápido que
   tu media histórica, verás el evento aparecer en vivo vía Realtime sin
   recargar la página.

### 5. Desplegar

El proyecto está listo para [Vercel](https://vercel.com):

```bash
npx vercel
```

Configura las mismas cuatro variables de entorno en el dashboard de Vercel
(Settings → Environment Variables) antes del primer deploy de producción.

## Estructura

```
app/
  (auth)/login, (auth)/signup       — páginas de autenticación
  (dashboard)/guardian              — vista del Guardian, con Realtime
  (dashboard)/positions             — listado + flujo de nueva posición
  api/theses                        — genera/cachea tesis vía Anthropic
components/
  guardian/, positions/, nav/       — componentes de UI
lib/
  supabase/                         — clientes browser/server/middleware
  actions/                          — server actions (auth, posiciones)
  markets.ts, types.ts, design-tokens.ts
supabase/migrations/0001_init.sql   — esquema completo + RLS + trigger
```

## Siguiente iteración sugerida

1. Implementar los tres detectores conductuales restantes en SQL.
2. Sustituir `lib/markets.ts` por el worker de ingesta en vivo.
3. Pantalla de Ajustes para editar `risk_tolerance_level`,
   `max_position_pct_bankroll`, `ircc_alert_threshold`, etc. desde la UI.
4. Generar `lib/types.ts` automáticamente con
   `supabase gen types typescript` una vez el esquema esté estable.
