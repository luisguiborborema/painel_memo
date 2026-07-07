-- ============================================================
-- MEMO V2 — Agenda: incluir follow-ups de CLIENTE (operação)
-- Adiciona os contatos agendados dos cards de operação como um tipo
-- próprio ('followup_cliente'), distinto do follow-up de lead ('atividade').
-- Rode este SQL no SQL Editor do Supabase (após o 0006).
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
    and l.arquivado = false
  union all
  select
    fw.proximo_contato_agendado                as data,
    'followup_cliente'::text                   as tipo,
    coalesce(
      fw.observacao,
      'Follow-up: ' || coalesce(ct.noivo1_nome || ' & ' || ct.noivo2_nome, 'cliente')
    )                                          as titulo,
    oc.id                                      as ref_id,
    ct.local                                   as local
  from operacao_followups fw
  join operacao_cards oc on oc.id = fw.operacao_id
  left join contratos ct on ct.id = oc.contrato_id
  where fw.feito = false
    and fw.proximo_contato_agendado is not null
    and oc.arquivado = false;
