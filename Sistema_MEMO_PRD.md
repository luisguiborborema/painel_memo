# Sistema de Gestão MEMO — Especificação Técnica (PRD)

**Produto:** CRM + ERP básico sob medida para a produtora MEMO (foto e vídeo para casamentos)
**Objetivo:** Sistema web simples centrado em duas esteiras Kanban (Comercial e Operação), com módulos de Agenda e Financeiro.
**Público interno:** Iago (comercial), Flávio e Caio Lemos (operação/sócios).
**Modelo de captação:** 100% orgânico/inbound. Leads chegam pelo WhatsApp via link na bio do Instagram. Cadastro inicial manual.

---

## 1. Visão geral e princípios

- **Simplicidade acima de tudo.** Não é para virar um ERP complexo. Cada campo/tela precisa influenciar uma ação real do dia a dia.
- **Dois Kanbans são o coração do sistema:** Comercial (captação → fechamento) e Operação (produção → entrega).
- **Fluxo linear único:** Lead entra no Comercial → é qualificado → recebe proposta → follow-up → fecha → **passagem de bastão obrigatória** → vira card na Operação → passa pelas etapas de produção → entrega.
- **Fonte única de verdade de datas:** a Agenda cruza eventos fechados + negociações em aberto para alimentar o alerta de disponibilidade nos cards.

### Fora de escopo (decisões do cliente)
- ❌ **Integração com IA (Gemini)** para geração de escopo — **cortado**, não fazer.
- ❌ **Integração com API do WhatsApp** — a régua de mensagens será apenas **textos prontos para copiar e colar** (ver seção 4).
- ❌ Tráfego pago, prospecção ativa, automação de captação — não se aplica ao modelo de negócio.

---

## 2. Papéis e permissões

| Papel | Acesso |
|---|---|
| Iago | Total. Único operador do Comercial. Vê Operação, Agenda e Financeiro. |
| Flávio / Caio | Operação, Agenda e Financeiro. Comercial em leitura (opcional). |

> Para o MVP, um modelo de permissão simples (todos veem tudo, com destaque de responsabilidade por módulo) é suficiente. Refinar depois se necessário.

---

## 3. Módulo Comercial (Kanban 1)

### 3.1 Colunas do Kanban
1. **Lead novo** — cadastro recém-criado, ainda em qualificação.
2. **Qualificado** — dados básicos coletados (data, nome, local, convidados, serviços).
3. **Proposta enviada** — cardápio interativo enviado ao casal.
4. **Follow-up** — em acompanhamento ativo pela cadência.
5. **Fechamento** — casal decidiu fechar; contrato/sinal em processo.

> A saída de "Fechamento" **não é automática**. Só sai via formulário de passagem de bastão (seção 6), que cria o card na Operação.

### 3.2 Tela de criação de novo lead
Formulário manual. Campos:

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome do casal | texto | Sim | Ex: "Marina & Rafael". Vira o título do card. |
| Data do casamento | data | Não | Dispara verificação de agenda em tempo real (ver 3.4). |
| Nº de convidados | número | Não | |
| Local (cerimônia/festa) | texto | Não | |
| Serviços de interesse | multi-seleção | Não | Foto, Vídeo, Pré-wedding, Civil, Making of, Outro. |
| WhatsApp | texto/telefone | Não | |
| Origem | seleção | Não | Instagram (bio), Indicação, Google, Outro. Métrica útil mesmo sendo tudo orgânico. |
| Anotação inicial | texto longo | Não | |

Ao salvar: cria o card na coluna **Lead novo** e exibe a régua de mensagens (seção 4) para o vendedor iniciar o contato.

### 3.3 Estrutura do card comercial (visão aberta)
O card, ao ser aberto, mostra:
- **Cabeçalho:** nome do casal + etiqueta da coluna atual.
- **Alerta de disponibilidade de data** (ver 3.4).
- **Infos:** local, nº de convidados, WhatsApp, origem.
- **Tags de serviços de interesse** (chips coloridos — ver 3.5).
- **Proposta:** campo para colar o **link do cardápio digital** + botão para abrir.
- **Checklist / régua** (ver 3.6).
- **Cadência de follow-up** com histórico de contatos e próximo contato agendado (ver 3.7).
- **Anotações** datadas (append-only, cada nota com data automática).

### 3.4 Alerta visual de disponibilidade de data
Ao informar/editar a data do casamento, o sistema cruza com a Agenda e retorna 1 de 3 estados:

| Estado | Condição | Visual |
|---|---|---|
| **Livre** | Nenhum evento fechado nem negociação na data | Verde — "Data livre na agenda" |
| **Em disputa** | Existe ≥1 outra negociação em aberto na mesma data | Amarelo — "Já existe negociação para esta data" (mostrar quantas) |
| **Fechada** | Já existe evento fechado (contrato assinado) na data | Vermelho — "Agenda FECHADA para esta data" |

Este alerta aparece tanto na criação do lead quanto no card aberto, e deve atualizar em tempo real conforme a data é digitada.

### 3.5 Etiquetas / Tags
Chips visuais de **serviços de interesse** no card: Foto, Vídeo, Pré-wedding, Civil, Making of, Outro. Cada serviço tem cor fixa para leitura rápida no board.

### 3.6 Checklist / régua (qualificação)
Checklist padrão que nasce com todo card, refletindo a triagem inicial:
- [ ] Boas-vindas + solicitar data e nome do casal
- [ ] Confirmar local (cerimônia/festa)
- [ ] Mapear serviços desejados
- [ ] Enviar proposta (cardápio)
- [ ] Confirmar recebimento da proposta

### 3.7 Cadência de follow-up
Estrutura para acompanhar tentativas de contato após o envio da proposta. Regra de cadência:
- **Semana 1:** 3 contatos
- **Mês 1 (semanas 2–4):** 1 contato por semana
- **Meses seguintes:** 1 a 2 contatos por mês

O card deve registrar o **histórico de contatos** (data + "feito") e destacar o **próximo contato previsto**. Para o MVP, o vendedor marca cada contato como realizado e o sistema sugere a data do próximo com base na regra acima. (Notificação automática é desejável, mas pode ficar para uma segunda iteração — confirmar com o dev.)

---

## 4. Régua de relacionamento (textos prontos)

**Não há integração com WhatsApp.** O sistema apenas armazena e exibe **mensagens-modelo para copiar e colar**, com botão "copiar". Sugestão de templates editáveis:

1. **Boas-vindas** — saudação + solicitação de data do casamento e nome do casal.
2. **Local** — pergunta sobre o local da cerimônia/festa.
3. **Serviços** — mapeamento dos serviços desejados (Foto, Vídeo, Pré-wedding, Civil etc.).
4. **Envio de proposta** — mensagem que acompanha o link do cardápio.
5. **Follow-ups** — 2 a 3 variações de mensagem de acompanhamento.

Os textos devem ser **editáveis** numa tela de configuração, com suporte a variáveis simples (ex: `{nome_casal}`, `{data}`) preenchidas automaticamente a partir do card.

---

## 5. Módulo Operação (Kanban 2)

### 5.1 Gatilho de entrada
Card criado **automaticamente** ao concluir a passagem de bastão (seção 6), cujo pré-requisito é: **contrato assinado + sinal de 30% confirmado**.

### 5.2 Onboarding (primeira etapa)
Checklist inicial do card de operação:
- [ ] Criar grupo de WhatsApp com os noivos + Iago + Flávio + Caio Lemos
- [ ] Enviar mensagem padrão de boas-vindas (template)

### 5.3 Colunas do Kanban de Operação
1. **Onboarding**
2. **Reunião de apresentação** (vídeo)
3. **Reunião de pré-wedding / civil** — *condicional*: só aparece/aplica se o pacote incluir esses serviços
4. **Visita técnica** ao local do evento
5. **Reunião de alinhamento final** (mês do casamento)
6. **Execução do casamento**
7. **Edição e finalização** (entrega)

### 5.4 Estrutura do card de operação
- Dados do casal e do evento (herdados da passagem de bastão): nomes, data, local, contatos, serviços contratados.
- Checklists por etapa.
- **Escala da equipe do evento** (ver 5.5).
- Anotações herdadas do comercial + novas anotações de produção.

### 5.5 Gestão de equipe / freelancers
Área dedicada no card para escalar a equipe do evento:
- Lista de participantes (sócios + freelancers).
- **Função específica** de cada um (ex: foto principal, 2º fotógrafo, vídeo, drone).
- Vínculo com o Financeiro para controle de pagamento de freelancers (ver 7.3).

---

## 6. Passagem de bastão (formulário de fechamento)

Formulário **interno e obrigatório** para mover o card de "Fechamento" (Comercial) para "Onboarding" (Operação). Ao confirmar, cria o card de operação e registra os lançamentos financeiros iniciais.

### Campos
**Dados do contrato:**
- Noivo 1 · nome
- Noivo 2 · nome
- CPF (noivo 1)
- CPF (noivo 2)
- Profissão
- E-mail
- Telefone
- Endereço completo
- Valor total
- Sinal (30%)
- Condição de pagamento (ex: 30% na assinatura + saldo em Nx PIX até o mês do evento)

**Serviços contratados:** lista do que o casal efetivamente fechou no cardápio, com valor de cada item (Cobertura fotográfica, Cobertura em vídeo, Pré-wedding, Drone, Álbum etc.). Serve para (a) alimentar as etapas condicionais da Operação e (b) compor o valor total.

**Anotações para a operação:** campo livre para o comercial passar contexto ao time de produção (preferências do casal, restrições do local, observações sensíveis etc.).

### Ao confirmar
1. Cria card na Operação (coluna Onboarding).
2. Gera lançamento de **receita** (sinal recebido + saldo parcelado a receber) no Financeiro.
3. Marca a data do evento como **fechada** na Agenda (passa a bloquear a data no alerta de disponibilidade).

---

## 7. Módulo Financeiro

Três sub-módulos: **Contas a receber**, **Contas a pagar** e **Split de lucro**.

### 7.1 Contas a receber
- Registra o recebimento do **sinal (30% na assinatura)** e o **saldo parcelado via PIX** até o mês do evento.
- Cada parcela: vencimento, descrição, valor, status (**Pago / A vencer / Atrasado**).
- Resumo por contrato: recebido, a receber, total.
- Origem dos lançamentos: gerados na passagem de bastão a partir da condição de pagamento.

### 7.2 Contas a pagar — despesas
Categorias:
- **Fixas:** contador (valor mensal fixo).
- **Variáveis:** impostos.
- **Freelancers:** pagamento vinculado ao evento (ver 7.3).

**Regra de impostos:** aproximadamente **12% sobre o faturamento total do mês** (NÃO por contrato individual). O sistema deve consolidar o faturamento mensal e calcular o imposto sobre esse total.

### 7.3 Gestão de pagamento de freelancers
- Modelo de pagamento: **50% de sinal (pré-evento) + 50% pós-evento**.
- Vinculado à escala de equipe do card de operação (seção 5.5).
- Cada freelancer/evento gera 2 lançamentos a pagar (sinal e saldo), com status e vencimento.

### 7.4 Split de pagamento (distribuição de lucros)
Cálculo automático da divisão, **nesta ordem**:

```
Receita do contrato
  − 12% (impostos)      → dedução
  − 10% (caixa da empresa) → dedução
  − custo de freelancers   → dedução
  = LUCRO LÍQUIDO
```

O lucro líquido é dividido entre os sócios em um de dois modos (selecionável por evento/período):
- **Proporção padrão:** Flávio 40% · Caio 40% · Iago 20%
- **Partes iguais:** ~33,3% cada

> **Ponto a alinhar com o contador:** no protótipo o split foi demonstrado com base no valor do contrato individual, enquanto os impostos (7.2) foram definidos como incidentes sobre o faturamento mensal. O dev deve confirmar se o split roda **por evento** (usando 12% como aproximação por contrato) ou **por fechamento mensal** (consolidando faturamento, impostos reais do mês e lucro do período). Recomenda-se implementar o split **por período mensal** para bater com a regra de imposto sobre faturamento, mantendo a visão por evento apenas como estimativa.

---

## 8. Módulo Agenda e Disponibilidade

- Calendário centralizado com visão de **todos os eventos fechados** + **bloqueios de data**.
- Cruza com **leads em negociação** (datas em aberto) para alimentar o alerta de disponibilidade (seção 3.4).
- Visões úteis: mensal e lista. Cada data mostra se está livre, em disputa ou fechada.
- Fonte de dados: eventos fechados vêm da passagem de bastão; negociações vêm dos cards comerciais com data preenchida.

---

## 9. Modelo de dados (sugestão inicial)

Entidades principais e campos-chave. Ajustar conforme a stack escolhida.

**Lead / Card comercial**
- id, nome_casal, data_casamento, num_convidados, local, whatsapp, origem
- servicos_interesse (lista)
- coluna_atual (enum)
- link_proposta
- checklist (lista de itens com status)
- follow_ups (lista: data, status)
- anotacoes (lista: data, texto)
- created_at, updated_at

**Contrato / Passagem de bastão**
- id, lead_id (fk)
- noivo1_nome, noivo2_nome, cpf1, cpf2, profissao, email, telefone, endereco
- valor_total, valor_sinal, condicao_pagamento
- servicos_contratados (lista: nome, valor)
- anotacoes_operacao (texto)
- created_at

**Card de operação**
- id, contrato_id (fk)
- coluna_atual (enum)
- checklists_por_etapa
- equipe (lista: pessoa, funcao, é_freelancer)
- anotacoes

**Financeiro — Receber**
- id, contrato_id (fk), descricao, valor, vencimento, status (pago/a_vencer/atrasado)

**Financeiro — Pagar**
- id, descricao, categoria (fixa/variavel/freelancer), valor, vencimento, status
- freelancer_id + evento_id (quando aplicável), parcela (sinal/saldo)

**Agenda**
- Derivada de contratos (fechados) + leads com data (negociação). Pode ser uma view, não uma tabela própria.

---

## 10. Prioridade de entrega (sugestão)

**MVP (fase 1):**
1. Kanban Comercial + criação de lead + card + tags + alerta de data.
2. Régua de mensagens (copiar/colar).
3. Passagem de bastão.
4. Kanban Operação + escala de equipe.
5. Agenda (leitura, alimentando o alerta).
6. Financeiro: contas a receber, contas a pagar, split.

**Iterações seguintes (nice-to-have):**
- Notificações automáticas de follow-up.
- Relatórios/dashboards de conversão e faturamento.
- Refino de permissões por papel.

---

## 11. Notas de UX

- Interface limpa, densa o suficiente para o board caber na tela sem poluição.
- Cores dos alertas de data seguem semântica universal: verde = livre, amarelo = atenção, vermelho = bloqueado.
- Todo valor monetário formatado em BRL (R$ 0.000,00).
- Cadastro rápido: criar um lead deve levar segundos, já que o vendedor faz isso durante a conversa no WhatsApp.
