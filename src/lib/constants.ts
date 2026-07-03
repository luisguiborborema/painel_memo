import type { LeadColuna, OperacaoColuna } from "./types";

export const LEAD_COLUNAS: { key: LeadColuna; label: string }[] = [
  { key: "lead_novo", label: "Lead novo" },
  { key: "qualificado", label: "Qualificado" },
  { key: "proposta_enviada", label: "Proposta enviada" },
  { key: "follow_up", label: "Follow-up" },
  { key: "fechamento", label: "Fechamento" },
];

export const OPERACAO_COLUNAS: { key: OperacaoColuna; label: string; condicional?: string }[] = [
  { key: "onboarding", label: "Onboarding" },
  { key: "reuniao_apresentacao", label: "Reunião de apresentação" },
  { key: "reuniao_prewedding", label: "Pré-wedding / Civil", condicional: "prewedding" },
  { key: "visita_tecnica", label: "Visita técnica" },
  { key: "alinhamento_final", label: "Alinhamento final" },
  { key: "execucao", label: "Execução do casamento" },
  { key: "edicao", label: "Edição e finalização" },
];

// Serviços de interesse + cores (chips)
export const SERVICOS: { key: string; label: string; cor: string }[] = [
  { key: "foto", label: "Foto", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "video", label: "Vídeo", cor: "bg-purple-100 text-purple-700 border-purple-200" },
  { key: "prewedding", label: "Pré-wedding", cor: "bg-pink-100 text-pink-700 border-pink-200" },
  { key: "civil", label: "Civil", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "making_of", label: "Making of", cor: "bg-teal-100 text-teal-700 border-teal-200" },
  { key: "outro", label: "Outro", cor: "bg-gray-100 text-gray-600 border-gray-200" },
];

export const SERVICO_MAP = Object.fromEntries(SERVICOS.map((s) => [s.key, s]));

export const ORIGENS: { key: string; label: string }[] = [
  { key: "instagram", label: "Instagram (bio)" },
  { key: "indicacao", label: "Indicação" },
  { key: "google", label: "Google" },
  { key: "outro", label: "Outro" },
];

// Checklists padrão por etapa da Operação
export const OPERACAO_CHECKLISTS: Record<string, { label: string; done: boolean }[]> = {
  onboarding: [
    { label: "Criar grupo de WhatsApp (noivos + Iago + Flávio + Caio)", done: false },
    { label: "Enviar mensagem padrão de boas-vindas", done: false },
  ],
  reuniao_apresentacao: [
    { label: "Agendar reunião de apresentação (vídeo)", done: false },
    { label: "Realizar reunião de apresentação", done: false },
  ],
  reuniao_prewedding: [
    { label: "Agendar sessão de pré-wedding / civil", done: false },
    { label: "Realizar sessão", done: false },
  ],
  visita_tecnica: [
    { label: "Agendar visita técnica ao local", done: false },
    { label: "Registrar pontos de luz / logística", done: false },
  ],
  alinhamento_final: [
    { label: "Reunião de alinhamento final (mês do evento)", done: false },
    { label: "Confirmar cronograma do dia", done: false },
  ],
  execucao: [
    { label: "Confirmar equipe escalada", done: false },
    { label: "Executar cobertura do casamento", done: false },
  ],
  edicao: [
    { label: "Seleção e edição do material", done: false },
    { label: "Entrega final ao casal", done: false },
  ],
};

// Split de lucro
export const SPLIT_IMPOSTOS = 0.12; // 12% impostos
export const SPLIT_CAIXA = 0.1; // 10% caixa da empresa
export const SPLIT_SOCIOS = {
  padrao: { Flávio: 0.4, Caio: 0.4, Iago: 0.2 },
  igual: { Flávio: 1 / 3, Caio: 1 / 3, Iago: 1 / 3 },
};
