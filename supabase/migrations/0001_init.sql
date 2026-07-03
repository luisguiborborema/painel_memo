-- ============================================================
-- MEMO — Sistema de Gestão (CRM + ERP)
-- Migration inicial: schema completo do MVP
-- Rode este SQL no SQL Editor do seu projeto Supabase.
-- ============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type lead_coluna as enum (
    'lead_novo', 'qualificado', 'proposta_enviada', 'follow_up', 'fechamento'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type operacao_coluna as enum (
    'onboarding', 'reuniao_apresentacao', 'reuniao_prewedding',
    'visita_tecnica', 'alinhamento_final', 'execucao', 'edicao'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type origem_lead as enum ('instagram', 'indicacao', 'google', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type receber_status as enum ('pago', 'a_vencer', 'atrasado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagar_categoria as enum ('fixa', 'variavel', 'freelancer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagar_status as enum ('pago', 'a_vencer', 'atrasado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type parcela_tipo as enum ('sinal', 'saldo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type split_modo as enum ('padrao', 'igual');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Trigger utilitário: updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- 1. LEADS (Card comercial — Kanban 1)
-- ============================================================
create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  nome_casal        text not null,
  data_casamento    date,
  num_convidados    integer,
  local             text,
  whatsapp          text,
  origem            origem_lead default 'instagram',
  servicos_interesse text[] not null default '{}',   -- foto, video, prewedding, civil, making_of, outro
  coluna_atual      lead_coluna not null default 'lead_novo',
  posicao           integer not null default 0,       -- ordenação dentro da coluna
  link_proposta     text,
  checklist         jsonb not null default '[
    {"label":"Boas-vindas + solicitar data e nome do casal","done":false},
    {"label":"Confirmar local (cerimônia/festa)","done":false},
    {"label":"Mapear serviços desejados","done":false},
    {"label":"Enviar proposta (cardápio)","done":false},
    {"label":"Confirmar recebimento da proposta","done":false}
  ]'::jsonb,
  arquivado         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_leads_coluna on leads(coluna_atual);
create index if not exists idx_leads_data on leads(data_casamento);
drop trigger if exists trg_leads_updated on leads;
create trigger trg_leads_updated before update on leads
  for each row execute function set_updated_at();

-- Follow-ups (cadência)
create table if not exists lead_followups (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  data        date not null,
  feito       boolean not null default false,
  observacao  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_followups_lead on lead_followups(lead_id);

-- Anotações datadas (append-only)
create table if not exists lead_anotacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  texto       text not null,
  autor       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_anotacoes_lead on lead_anotacoes(lead_id);

-- ============================================================
-- 2. CONTRATOS (Passagem de bastão)
-- ============================================================
create table if not exists contratos (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid references leads(id) on delete set null,
  noivo1_nome        text not null,
  noivo2_nome        text not null,
  cpf1               text,
  cpf2               text,
  profissao          text,
  email              text,
  telefone           text,
  endereco           text,
  data_evento        date,             -- data do casamento (bloqueia agenda)
  local              text,
  valor_total        numeric(12,2) not null default 0,
  valor_sinal        numeric(12,2) not null default 0,
  condicao_pagamento text,
  anotacoes_operacao text,
  split_modo         split_modo not null default 'padrao',
  created_at         timestamptz not null default now()
);
create index if not exists idx_contratos_data on contratos(data_evento);

-- Serviços contratados (itens do cardápio fechados)
create table if not exists contrato_servicos (
  id           uuid primary key default gen_random_uuid(),
  contrato_id  uuid not null references contratos(id) on delete cascade,
  nome         text not null,          -- Cobertura fotográfica, Vídeo, Pré-wedding, Drone, Álbum...
  valor        numeric(12,2) not null default 0
);
create index if not exists idx_contrato_servicos_contrato on contrato_servicos(contrato_id);

-- ============================================================
-- 3. OPERAÇÃO (Kanban 2)
-- ============================================================
create table if not exists operacao_cards (
  id           uuid primary key default gen_random_uuid(),
  contrato_id  uuid not null references contratos(id) on delete cascade,
  coluna_atual operacao_coluna not null default 'onboarding',
  posicao      integer not null default 0,
  checklists   jsonb not null default '{}'::jsonb,   -- { coluna: [ {label, done} ] }
  anotacoes    text,
  arquivado    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_operacao_coluna on operacao_cards(coluna_atual);
drop trigger if exists trg_operacao_updated on operacao_cards;
create trigger trg_operacao_updated before update on operacao_cards
  for each row execute function set_updated_at();

-- Escala de equipe / freelancers do evento
create table if not exists operacao_equipe (
  id            uuid primary key default gen_random_uuid(),
  operacao_id   uuid not null references operacao_cards(id) on delete cascade,
  pessoa        text not null,
  funcao        text,                  -- foto principal, 2º fotógrafo, vídeo, drone...
  is_freelancer boolean not null default true,
  valor         numeric(12,2) not null default 0,   -- custo do freelancer (base p/ 50/50)
  created_at    timestamptz not null default now()
);
create index if not exists idx_equipe_operacao on operacao_equipe(operacao_id);

-- ============================================================
-- 4. FINANCEIRO — Contas a receber
-- ============================================================
create table if not exists fin_receber (
  id           uuid primary key default gen_random_uuid(),
  contrato_id  uuid references contratos(id) on delete cascade,
  descricao    text not null,
  valor        numeric(12,2) not null default 0,
  vencimento   date,
  status       receber_status not null default 'a_vencer',
  pago_em      date,
  created_at   timestamptz not null default now()
);
create index if not exists idx_receber_contrato on fin_receber(contrato_id);
create index if not exists idx_receber_venc on fin_receber(vencimento);

-- ============================================================
-- 5. FINANCEIRO — Contas a pagar
-- ============================================================
create table if not exists fin_pagar (
  id            uuid primary key default gen_random_uuid(),
  descricao     text not null,
  categoria     pagar_categoria not null default 'variavel',
  valor         numeric(12,2) not null default 0,
  vencimento    date,
  status        pagar_status not null default 'a_vencer',
  pago_em       date,
  -- quando categoria = freelancer:
  operacao_id   uuid references operacao_cards(id) on delete set null,
  equipe_id     uuid references operacao_equipe(id) on delete set null,
  parcela       parcela_tipo,          -- sinal / saldo
  created_at    timestamptz not null default now()
);
create index if not exists idx_pagar_venc on fin_pagar(vencimento);
create index if not exists idx_pagar_categoria on fin_pagar(categoria);

-- ============================================================
-- 6. Régua de mensagens (templates editáveis)
-- ============================================================
create table if not exists msg_templates (
  id         uuid primary key default gen_random_uuid(),
  chave      text unique not null,     -- boas_vindas, local, servicos, proposta, followup_1...
  titulo     text not null,
  corpo      text not null,            -- suporta {nome_casal}, {data}
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_msg_updated on msg_templates;
create trigger trg_msg_updated before update on msg_templates
  for each row execute function set_updated_at();

-- Templates padrão (idempotente)
insert into msg_templates (chave, titulo, corpo, ordem) values
  ('boas_vindas', 'Boas-vindas',
   E'Oi {nome_casal}! 💛 Aqui é da MEMO, que alegria receber vocês!\nPra começar, me contam a *data do casamento* e o *nome de vocês* dois? Assim já verifico a disponibilidade na nossa agenda. ✨', 1),
  ('local', 'Local',
   E'Que lindo! 😍 E onde vai ser a *cerimônia* e a *festa*? Se já tiverem o local definido, me passem que ajuda a gente a se organizar.', 2),
  ('servicos', 'Serviços',
   E'Perfeito! Pra montar a melhor proposta pra vocês, quais serviços têm interesse?\n📸 Foto  🎥 Vídeo  💍 Pré-wedding  📝 Civil  🎬 Making of', 3),
  ('proposta', 'Envio de proposta',
   E'{nome_casal}, montei um cardápio digital especial pra vocês! 💛\nÉ só abrir aqui e escolher o que faz sentido: {link_proposta}\nQualquer dúvida me chamem, tô por aqui. 😊', 4),
  ('followup_1', 'Follow-up 1',
   E'Oi {nome_casal}! Conseguiram dar uma olhadinha no cardápio? Fico à disposição pra ajudar a montar o pacote ideal. 💛', 5),
  ('followup_2', 'Follow-up 2',
   E'Passando pra saber se ficou alguma dúvida sobre a proposta 😊 A data de vocês ({data}) ainda está livre na nossa agenda, mas costuma sair rápido!', 6),
  ('followup_3', 'Follow-up 3',
   E'Oi {nome_casal}! Ainda dá tempo de garantir a MEMO no casamento de vocês. Quer que eu reserve a data de vocês? 💛', 7),
  ('onboarding', 'Onboarding operação',
   E'Olá {nome_casal}! 🎉 Sejam muito bem-vindos à família MEMO! Criamos este grupo com a nossa equipe (Iago, Flávio e Caio) pra cuidar de cada detalhe do casamento de vocês. Vamos juntos! 💛', 8)
on conflict (chave) do nothing;

-- ============================================================
-- 7. RLS — modelo simples (todos os usuários autenticados veem tudo)
-- ============================================================
alter table leads             enable row level security;
alter table lead_followups    enable row level security;
alter table lead_anotacoes    enable row level security;
alter table contratos         enable row level security;
alter table contrato_servicos enable row level security;
alter table operacao_cards    enable row level security;
alter table operacao_equipe   enable row level security;
alter table fin_receber       enable row level security;
alter table fin_pagar         enable row level security;
alter table msg_templates     enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'leads','lead_followups','lead_anotacoes','contratos','contrato_servicos',
    'operacao_cards','operacao_equipe','fin_receber','fin_pagar','msg_templates'
  ] loop
    execute format('drop policy if exists "auth_all" on %I;', t);
    execute format(
      'create policy "auth_all" on %I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- ============================================================
-- 8. VIEW de agenda (disponibilidade por data)
--    Consolida contratos (fechados) + leads em negociação (com data).
-- ============================================================
create or replace view v_agenda as
  select
    c.data_evento                              as data,
    'fechado'::text                            as tipo,
    coalesce(c.noivo1_nome || ' & ' || c.noivo2_nome, l.nome_casal) as titulo,
    c.id                                       as ref_id,
    c.local                                    as local
  from contratos c
  left join leads l on l.id = c.lead_id
  where c.data_evento is not null
  union all
  select
    l.data_casamento                           as data,
    'negociacao'::text                         as tipo,
    l.nome_casal                               as titulo,
    l.id                                       as ref_id,
    l.local                                    as local
  from leads l
  where l.data_casamento is not null
    and l.arquivado = false
    and not exists (
      select 1 from contratos c2 where c2.lead_id = l.id
    );

-- Fim da migration.
