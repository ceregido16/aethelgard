-- Aethelgard — Esquema inicial con Row Level Security completo
-- Ejecutar contra un proyecto Supabase nuevo (SQL Editor o `supabase db push`).

create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  risk_tolerance_level smallint not null default 3
    check (risk_tolerance_level between 1 and 5),
  max_position_pct_bankroll numeric(5,2) not null default 5.00
    check (max_position_pct_bankroll > 0 and max_position_pct_bankroll <= 100),
  max_correlated_exposure_pct numeric(5,2) not null default 20.00
    check (max_correlated_exposure_pct > 0 and max_correlated_exposure_pct <= 100),
  ircc_alert_threshold smallint not null default 60
    check (ircc_alert_threshold between 0 and 100),
  session_fatigue_minutes_cap integer not null default 90
    check (session_fatigue_minutes_cap > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los usuarios leen su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Los usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Los usuarios crean su propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- ai_audit_theses
-- ============================================================
create table public.ai_audit_theses (
  id uuid primary key default uuid_generate_v4(),
  source_market_id text not null,
  source_market text not null check (source_market in ('polymarket', 'kalshi')),
  base_probability numeric(6,4) not null check (base_probability between 0 and 1),
  favor_premises jsonb not null default '[]'::jsonb,
  blind_spots jsonb not null default '[]'::jsonb,
  tail_scenarios jsonb not null default '[]'::jsonb,
  model_version text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint blind_spots_no_vacios
    check (jsonb_array_length(blind_spots) > 0)
);

create index idx_ai_theses_market on public.ai_audit_theses (source_market, source_market_id);

alter table public.ai_audit_theses enable row level security;

-- Las tesis son de lectura pública para cualquier usuario autenticado
-- (son análisis de mercado, no datos personales).
create policy "Usuarios autenticados leen tesis de IA"
  on public.ai_audit_theses for select
  using (auth.role() = 'authenticated');

-- Solo el service role (ruta /api/theses) puede insertar tesis.
create policy "Solo service role inserta tesis"
  on public.ai_audit_theses for insert
  with check (auth.role() = 'service_role');

-- ============================================================
-- market_positions
-- ============================================================
create table public.market_positions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_market text not null check (source_market in ('polymarket', 'kalshi')),
  source_market_id text not null,
  market_question text not null,
  stake_amount numeric(14,2) not null check (stake_amount > 0),
  entry_price numeric(6,4) not null check (entry_price between 0 and 1),
  side text not null check (side in ('yes', 'no')),
  status text not null default 'active'
    check (status in ('active', 'closed_won', 'closed_lost', 'closed_void')),
  related_ai_thesis_id uuid references public.ai_audit_theses(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index idx_positions_user on public.market_positions (user_id, opened_at desc);

alter table public.market_positions enable row level security;

create policy "Los usuarios gestionan sus propias posiciones"
  on public.market_positions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- emotional_risk_logs (append-only)
-- ============================================================
create table public.emotional_risk_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  related_position_id uuid references public.market_positions(id),
  bias_type text not null check (
    bias_type in ('time_between_bets', 'loss_chasing', 'decision_fatigue', 'overconcentration')
  ),
  severity_score smallint not null check (severity_score between 0 and 100),
  fatigue_index_snapshot smallint check (fatigue_index_snapshot between 0 and 100),
  ircc_snapshot smallint not null check (ircc_snapshot between 0 and 100),
  detail_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_risk_logs_user on public.emotional_risk_logs (user_id, created_at desc);

alter table public.emotional_risk_logs enable row level security;

create policy "Los usuarios leen sus propios logs de riesgo"
  on public.emotional_risk_logs for select
  using (auth.uid() = user_id);

-- Los logs se insertan exclusivamente vía el trigger (security definer),
-- nunca directamente desde el cliente ni desde una API route de usuario.
create policy "Solo service role inserta logs de riesgo"
  on public.emotional_risk_logs for insert
  with check (auth.role() = 'service_role');

-- ============================================================
-- Habilita Realtime sobre emotional_risk_logs para que
-- GuardianView.tsx reciba los eventos por WebSocket sin polling.
-- ============================================================
alter publication supabase_realtime add table public.emotional_risk_logs;

-- ============================================================
-- Trigger: Detector de Velocidad Temporal Inter-Apuesta (TBB)
-- Sección 1.3.1 del PRD. Corre en la misma transacción que el insert
-- de la posición, así que el IRCC está disponible de inmediato.
-- ============================================================
create or replace function public.fn_evaluate_behavioral_risk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg_tbb_seconds numeric;
  v_last_tbb_seconds numeric;
  v_severity smallint;
  v_previous_ircc smallint;
  v_new_ircc smallint;
begin
  -- Media histórica de tiempo entre apuestas del usuario (ventana 30 días,
  -- excluyendo la fila recién insertada).
  select avg(gap) into v_avg_tbb_seconds
  from (
    select extract(epoch from (opened_at - lag(opened_at) over (order by opened_at))) as gap
    from public.market_positions
    where user_id = new.user_id
      and opened_at >= now() - interval '30 days'
      and id <> new.id
  ) sub
  where gap is not null;

  -- Tiempo entre la posición anterior más reciente y esta nueva.
  select extract(epoch from (new.opened_at - max(opened_at)))
    into v_last_tbb_seconds
  from public.market_positions
  where user_id = new.user_id
    and id <> new.id;

  select coalesce(max(ircc_snapshot), 0) into v_previous_ircc
  from public.emotional_risk_logs
  where user_id = new.user_id;

  -- Solo evalúa si hay suficiente historial para tener una línea base real.
  if v_avg_tbb_seconds is not null and v_last_tbb_seconds is not null
     and v_last_tbb_seconds < (v_avg_tbb_seconds * 0.3) then

    v_severity := least(
      100,
      65 + floor((1 - (v_last_tbb_seconds / nullif(v_avg_tbb_seconds, 0))) * 30)
    )::smallint;

    v_new_ircc := least(100, v_previous_ircc + floor(v_severity / 4))::smallint;

    insert into public.emotional_risk_logs (
      user_id, related_position_id, bias_type,
      severity_score, ircc_snapshot, detail_payload
    ) values (
      new.user_id, new.id, 'time_between_bets',
      v_severity, v_new_ircc,
      jsonb_build_object(
        'avg_tbb_seconds', v_avg_tbb_seconds,
        'last_tbb_seconds', v_last_tbb_seconds
      )
    );
  end if;

  return new;
end;
$$;

create trigger trg_evaluate_behavioral_risk
  after insert on public.market_positions
  for each row
  execute function public.fn_evaluate_behavioral_risk();

-- ============================================================
-- Nota de alcance: este slice del MVP implementa el Detector de
-- Velocidad Temporal completo. Los detectores de Loss-Chasing,
-- Fatiga de Decisión y Sobreconcentración (Sección 1.3.1 del PRD)
-- siguen el mismo patrón — trigger AFTER INSERT sobre
-- market_positions, security definer, insert condicional en
-- emotional_risk_logs — y quedan como siguiente iteración.
-- ============================================================
