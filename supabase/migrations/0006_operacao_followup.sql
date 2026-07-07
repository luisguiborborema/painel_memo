-- ============================================================
-- MEMO V2 — Follow-up e anotações no card de Operação
-- Espelha lead_followups / lead_anotacoes para os cards de operação.
-- Rode este SQL no SQL Editor do Supabase.
-- ============================================================

create table if not exists operacao_followups (
  id                        uuid primary key default gen_random_uuid(),
  operacao_id               uuid not null references operacao_cards(id) on delete cascade,
  data                      date not null,
  feito                     boolean not null default false,
  observacao                text,
  proximo_contato_agendado  date,
  created_at                timestamptz not null default now()
);
create index if not exists idx_op_followups_op on operacao_followups(operacao_id);

create table if not exists operacao_anotacoes (
  id          uuid primary key default gen_random_uuid(),
  operacao_id uuid not null references operacao_cards(id) on delete cascade,
  texto       text not null,
  autor       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_op_anotacoes_op on operacao_anotacoes(operacao_id);

alter table operacao_followups enable row level security;
alter table operacao_anotacoes enable row level security;
drop policy if exists "auth_all" on operacao_followups;
drop policy if exists "auth_all" on operacao_anotacoes;
create policy "auth_all" on operacao_followups for all to authenticated using (true) with check (true);
create policy "auth_all" on operacao_anotacoes for all to authenticated using (true) with check (true);
