-- ============================================================
-- MEMO — Configuração financeira editável
-- Parâmetros de imposto, caixa e distribuição entre sócios.
-- Rode este SQL no SQL Editor do Supabase.
-- ============================================================

create table if not exists fin_config (
  id          int primary key default 1,
  imposto_pct numeric(6,3) not null default 12,   -- % sobre a receita
  caixa_pct   numeric(6,3) not null default 10,   -- % de caixa da empresa
  socios      jsonb not null default '[
    {"nome":"Flávio","pct":40},
    {"nome":"Caio","pct":40},
    {"nome":"Iago","pct":20}
  ]'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint fin_config_singleton check (id = 1)
);

insert into fin_config (id) values (1) on conflict (id) do nothing;

alter table fin_config enable row level security;
drop policy if exists "auth_all" on fin_config;
create policy "auth_all" on fin_config for all to authenticated using (true) with check (true);
