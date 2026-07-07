-- ============================================================
-- MEMO V2 — Financeiro (modelos de pagamento, vínculo de evento em
-- contas a pagar, atividades na agenda)
-- Rode este SQL no SQL Editor do Supabase (após o 0004).
-- ============================================================

-- ---------- contratos: modelo de pagamento ----------
alter table contratos
  add column if not exists modelo_pagamento text not null default 'sinal_30_parcelado',
  add column if not exists num_parcelas integer,
  add column if not exists desconto numeric(12,2) not null default 0;

-- ---------- fin_pagar: vínculo direto ao evento/contrato ----------
alter table fin_pagar
  add column if not exists contrato_id uuid references contratos(id) on delete cascade;
create index if not exists idx_pagar_contrato on fin_pagar(contrato_id);

-- ---------- v_agenda: incluir a "próxima atividade" dos leads ----------
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
    and not exists (select 1 from contratos c2 where c2.lead_id = l.id)
  union all
  select
    l.proxima_atividade_data                   as data,
    'atividade'::text                          as tipo,
    coalesce(l.proxima_atividade_desc, 'Contato: ' || l.nome_casal) as titulo,
    l.id                                       as ref_id,
    l.local                                    as local
  from leads l
  where l.proxima_atividade_data is not null
    and l.arquivado = false;
