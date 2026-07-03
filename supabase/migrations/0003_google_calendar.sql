-- ============================================================
-- MEMO — Integração Google Agenda
-- Guarda o ID do evento no Google para cada contrato (sync).
-- Rode este SQL no SQL Editor do Supabase.
-- ============================================================

alter table contratos
  add column if not exists google_event_id text,
  add column if not exists google_synced_at timestamptz;

create index if not exists idx_contratos_google on contratos(google_event_id);
