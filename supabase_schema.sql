-- =====================================================================
--  INDIRIZZARIO ACCOGLIENZE — Progetto Puer
--  Schema database per Supabase (Postgres)
--
--  COME USARLO:
--  1. Vai su https://supabase.com  ->  crea un progetto (piano gratuito)
--  2. Apri "SQL Editor"  ->  "New query"
--  3. Incolla TUTTO questo file e premi "Run".
--  Le tabelle, gli indici e le regole di sicurezza (RLS) vengono create.
-- =====================================================================

-- ---------- Tabella FAMIGLIE (la famiglia ospitante) ----------
create table if not exists public.famiglie (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Adulto 1 (referente)
  adulto1_cognome   text not null,
  adulto1_nome      text not null,
  adulto1_nascita   date,

  -- Adulto 2 (opzionale)
  adulto2_cognome   text,
  adulto2_nome      text,
  adulto2_nascita   date,

  -- Recapiti / residenza
  citta             text,
  prov              text,
  indirizzo         text,
  telefono          text,          -- puo' contenere piu' numeri, es. "327... / 360..."
  email             text[] default '{}',  -- una o piu' email

  note              text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- Tabella MINORI (collegati alla famiglia) ----------
create table if not exists public.minori (
  id                uuid primary key default gen_random_uuid(),
  famiglia_id       uuid not null references public.famiglie(id) on delete cascade,

  cognome           text not null,
  nome              text not null,
  nascita           date,
  anni              integer,        -- calcolato in automatico, ma modificabile
  provenienza       text,           -- "famiglia", "istituto" o testo libero
  periodo           text[] default '{}', -- mesi selezionati, es. {Giugno,Luglio,Agosto}

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists minori_famiglia_id_idx on public.minori(famiglia_id);
create index if not exists famiglie_user_id_idx    on public.famiglie(user_id);

-- =====================================================================
--  SICUREZZA (Row Level Security)
--  Ogni utente vede e modifica SOLO i propri dati.
-- =====================================================================
alter table public.famiglie enable row level security;
alter table public.minori   enable row level security;

-- --- FAMIGLIE: proprietario = utente autenticato ---
drop policy if exists "famiglie_select" on public.famiglie;
create policy "famiglie_select" on public.famiglie
  for select using (auth.uid() = user_id);

drop policy if exists "famiglie_insert" on public.famiglie;
create policy "famiglie_insert" on public.famiglie
  for insert with check (auth.uid() = user_id);

drop policy if exists "famiglie_update" on public.famiglie;
create policy "famiglie_update" on public.famiglie
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "famiglie_delete" on public.famiglie;
create policy "famiglie_delete" on public.famiglie
  for delete using (auth.uid() = user_id);

-- --- MINORI: accessibili se la famiglia collegata e' dell'utente ---
drop policy if exists "minori_select" on public.minori;
create policy "minori_select" on public.minori
  for select using (
    exists (select 1 from public.famiglie f
            where f.id = minori.famiglia_id and f.user_id = auth.uid())
  );

drop policy if exists "minori_insert" on public.minori;
create policy "minori_insert" on public.minori
  for insert with check (
    exists (select 1 from public.famiglie f
            where f.id = minori.famiglia_id and f.user_id = auth.uid())
  );

drop policy if exists "minori_update" on public.minori;
create policy "minori_update" on public.minori
  for update using (
    exists (select 1 from public.famiglie f
            where f.id = minori.famiglia_id and f.user_id = auth.uid())
  );

drop policy if exists "minori_delete" on public.minori;
create policy "minori_delete" on public.minori
  for delete using (
    exists (select 1 from public.famiglie f
            where f.id = minori.famiglia_id and f.user_id = auth.uid())
  );
