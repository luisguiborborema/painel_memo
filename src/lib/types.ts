export type LeadColuna =
  | "lead_novo"
  | "qualificado"
  | "proposta_enviada"
  | "follow_up"
  | "fechamento";

export type OperacaoColuna =
  | "onboarding"
  | "reuniao_apresentacao"
  | "reuniao_prewedding"
  | "visita_tecnica"
  | "alinhamento_final"
  | "execucao"
  | "edicao";

export type OrigemLead = "instagram" | "indicacao" | "google" | "outro";
export type ReceberStatus = "pago" | "a_vencer" | "atrasado";
export type PagarCategoria = "fixa" | "variavel" | "freelancer";
export type PagarStatus = "pago" | "a_vencer" | "atrasado";
export type ParcelaTipo = "sinal" | "saldo";
export type SplitModo = "padrao" | "igual";

export type ChecklistItem = { label: string; done: boolean };

export type Lead = {
  id: string;
  nome_casal: string;
  data_casamento: string | null;
  num_convidados: number | null;
  local: string | null;
  whatsapp: string | null;
  origem: OrigemLead | null;
  servicos_interesse: string[];
  coluna_atual: LeadColuna;
  posicao: number;
  link_proposta: string | null;
  checklist: ChecklistItem[];
  arquivado: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadFollowup = {
  id: string;
  lead_id: string;
  data: string;
  feito: boolean;
  observacao: string | null;
  created_at: string;
};

export type LeadAnotacao = {
  id: string;
  lead_id: string;
  texto: string;
  autor: string | null;
  created_at: string;
};

export type Contrato = {
  id: string;
  lead_id: string | null;
  noivo1_nome: string;
  noivo2_nome: string;
  cpf1: string | null;
  cpf2: string | null;
  profissao: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  data_evento: string | null;
  local: string | null;
  valor_total: number;
  valor_sinal: number;
  condicao_pagamento: string | null;
  anotacoes_operacao: string | null;
  split_modo: SplitModo;
  google_event_id: string | null;
  google_synced_at: string | null;
  created_at: string;
};

export type ContratoServico = {
  id: string;
  contrato_id: string;
  nome: string;
  valor: number;
};

export type OperacaoCard = {
  id: string;
  contrato_id: string;
  coluna_atual: OperacaoColuna;
  posicao: number;
  checklists: Record<string, ChecklistItem[]>;
  anotacoes: string | null;
  arquivado: boolean;
  created_at: string;
  updated_at: string;
};

export type OperacaoEquipe = {
  id: string;
  operacao_id: string;
  pessoa: string;
  funcao: string | null;
  is_freelancer: boolean;
  valor: number;
  created_at: string;
};

export type FinReceber = {
  id: string;
  contrato_id: string | null;
  descricao: string;
  valor: number;
  vencimento: string | null;
  status: ReceberStatus;
  pago_em: string | null;
  created_at: string;
};

export type FinPagar = {
  id: string;
  descricao: string;
  categoria: PagarCategoria;
  valor: number;
  vencimento: string | null;
  status: PagarStatus;
  pago_em: string | null;
  operacao_id: string | null;
  equipe_id: string | null;
  parcela: ParcelaTipo | null;
  created_at: string;
};

export type MsgTemplate = {
  id: string;
  chave: string;
  titulo: string;
  corpo: string;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type SocioConfig = { nome: string; pct: number };

export type FinConfig = {
  id: number;
  imposto_pct: number;
  caixa_pct: number;
  socios: SocioConfig[];
  updated_at: string;
};

export type AgendaItem = {
  data: string;
  tipo: "fechado" | "negociacao" | "google";
  titulo: string;
  ref_id: string;
  local: string | null;
  link?: string | null; // htmlLink do Google (para eventos externos)
};
