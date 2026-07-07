-- ============================================================
-- MEMO V2 — Comercial (porte, serviços com valor, próxima atividade,
-- agendamento de follow-up, serviços editáveis em Config)
-- Rode este SQL no SQL Editor do Supabase.
-- ============================================================

-- ---------- leads: porte, serviços com valor, próxima atividade ----------
alter table leads
  add column if not exists porte text,                       -- intimista|mini_wedding|classico|especial
  add column if not exists porte_manual boolean not null default false,
  add column if not exists servicos jsonb not null default '[]'::jsonb,  -- [{nome, valor}]
  add column if not exists proxima_atividade_data date,
  add column if not exists proxima_atividade_desc text;

-- Data-migrate: popular servicos a partir de servicos_interesse (valor 0),
-- só onde ainda estiver vazio. Usa rótulos amigáveis.
update leads l
set servicos = sub.arr
from (
  select id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'nome',
          case s
            when 'foto' then 'Foto'
            when 'video' then 'Vídeo'
            when 'prewedding' then 'Pré-wedding'
            when 'civil' then 'Civil'
            when 'making_of' then 'Making of'
            else initcap(s)
          end,
          'valor', 0
        )
      ) filter (where s is not null),
      '[]'::jsonb
    ) as arr
  from leads
  left join lateral unnest(servicos_interesse) as s on true
  group by id
) sub
where l.id = sub.id
  and (l.servicos is null or l.servicos = '[]'::jsonb)
  and array_length(l.servicos_interesse, 1) is not null;

-- ---------- lead_followups: agendamento do próximo contato ----------
alter table lead_followups
  add column if not exists proximo_contato_agendado date;

-- ---------- servicos_config: lista de serviços editável ----------
create table if not exists servicos_config (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cor        text not null default 'bg-neutral-100 text-neutral-600 border-neutral-200',
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

insert into servicos_config (nome, cor, ordem) values
  ('Foto',        'bg-blue-100 text-blue-700 border-blue-200', 1),
  ('Vídeo',       'bg-purple-100 text-purple-700 border-purple-200', 2),
  ('Pré-wedding', 'bg-pink-100 text-pink-700 border-pink-200', 3),
  ('Civil',       'bg-amber-100 text-amber-700 border-amber-200', 4),
  ('Making of',   'bg-teal-100 text-teal-700 border-teal-200', 5),
  ('Álbum',       'bg-emerald-100 text-emerald-700 border-emerald-200', 6),
  ('Drone',       'bg-sky-100 text-sky-700 border-sky-200', 7),
  ('Outro',       'bg-neutral-100 text-neutral-600 border-neutral-200', 8)
on conflict do nothing;

alter table servicos_config enable row level security;
drop policy if exists "auth_all" on servicos_config;
create policy "auth_all" on servicos_config for all to authenticated using (true) with check (true);
