# Sistema MEMO — CRM + ERP

Sistema de gestão da produtora MEMO (foto e vídeo para casamentos). Dois Kanbans no
centro — **Comercial** (captação → fechamento) e **Operação** (produção → entrega) —
mais **Agenda**, **Financeiro** (receber, pagar, split de lucro) e a **régua de
mensagens**. Especificação completa em [Sistema_MEMO_PRD.md](./Sistema_MEMO_PRD.md).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **Supabase** (Postgres + Auth)

## Setup

1. **Crie um projeto** em [supabase.com](https://supabase.com).

2. **Rode o schema**: no SQL Editor do Supabase, cole e execute o conteúdo de
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   Isso cria todas as tabelas, a view de agenda, as políticas de acesso (RLS) e os
   templates padrão da régua.

3. **Credenciais**: em *Project Settings → API*, copie a **Project URL** e a
   **anon public key**. Cole no arquivo `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

4. **Usuários da equipe**: em *Authentication → Users*, crie os logins (e-mail +
   senha) para Iago, Flávio e Caio. Não há cadastro público — o acesso é restrito.

5. **Rode**:

   ```bash
   npm install
   npm run dev
   ```

   Abra <http://localhost:3000>. Enquanto o `.env.local` não estiver preenchido, o
   app mostra uma tela de setup com estas instruções.

## Fluxo do sistema

1. **Comercial** — cria-se o lead (segundos); ele passa por Lead novo → Qualificado
   → Proposta → Follow-up → Fechamento. O card mostra alerta de disponibilidade da
   data (🟢 livre / 🟡 em disputa / 🔴 fechada), checklist, cadência de follow-up e a
   régua de mensagens (copiar e colar, com variáveis preenchidas).

2. **Passagem de bastão** — formulário obrigatório que fecha o comercial. Ao
   confirmar: cria o card na Operação, gera as contas a receber (sinal 30% + saldo
   parcelado) e marca a data como **fechada** na Agenda.

3. **Operação** — Onboarding → reuniões → visita técnica → alinhamento → execução →
   edição/entrega. Checklists por etapa e escala da equipe (freelancers geram
   automaticamente 2 lançamentos a pagar: 50% sinal + 50% pós-evento).

4. **Financeiro** — contas a receber, a pagar (com cálculo de imposto de 12% sobre o
   faturamento mensal) e split de lucro (12% impostos − 10% caixa − freelancers =
   lucro, dividido 40/40/20 ou em partes iguais).

5. **Agenda** — calendário mensal + lista, consolidando eventos fechados e
   negociações em aberto. Sincroniza com o **Google Agenda** (ver abaixo).

## Integração com o Google Agenda (opcional)

Sincronização de **dois sentidos** com um **calendário único da MEMO**, via
Service Account (sem cada pessoa precisar logar). Só eventos **fechados**
(contratos) são enviados; eventos criados direto no Google aparecem na agenda
do MEMO marcados em azul.

Setup:

1. No [Google Cloud Console](https://console.cloud.google.com): crie um projeto e
   ative a **Google Calendar API**.
2. Crie uma **Service Account** e gere uma **chave JSON**.
3. No Google Agenda, abra as configurações do calendário da MEMO →
   **Compartilhar com pessoas específicas** → adicione o e-mail da service
   account com permissão **"Fazer alterações nos eventos"**.
4. Copie o **ID do calendário** (Configurações → "ID do calendário").
5. Preencha no `.env.local` (nunca com prefixo `NEXT_PUBLIC`):

   ```
   GOOGLE_CLIENT_EMAIL=...@...iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_CALENDAR_ID=...@group.calendar.google.com
   ```

6. Rode o SQL de `supabase/migrations/0003_google_calendar.sql`.
7. Reinicie o servidor. Na Agenda aparece o botão **↻ Sincronizar Google**.

Sem essas variáveis, a integração fica desativada e a agenda funciona só com os
dados do MEMO (nenhum erro).

## Estrutura

```
src/
  app/
    (app)/            # área autenticada (sidebar compartilhada)
      comercial/      # Kanban 1 + card + passagem de bastão
      operacao/       # Kanban 2 + escala de equipe
      agenda/         # calendário
      financeiro/     # receber / pagar / split
      config/         # régua de mensagens editável
    login/
  lib/
    supabase/         # clients (browser, server, proxy) + env
    agenda.ts         # regra de disponibilidade de data
    cadencia.ts       # regra de follow-up
    constants.ts      # colunas, serviços, checklists, split
    format.ts         # BRL, datas, variáveis de template
  components/         # UI compartilhada, Kanban, Sidebar, régua
supabase/migrations/  # schema SQL
```
