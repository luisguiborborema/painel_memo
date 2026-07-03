import { addDays, toISODate } from "./format";

// Regra de cadência (PRD 3.7):
// Semana 1: 3 contatos (~a cada 2 dias)
// Mês 1 (sem 2-4): 1 por semana
// Meses seguintes: 1 a 2 por mês (~a cada 20 dias)
export function proximoContato(qtdFeitos: number, ultimaData?: string | null): string {
  const base = ultimaData ?? toISODate(new Date());
  let intervalo: number;
  if (qtdFeitos < 3) intervalo = 2; // semana 1
  else if (qtdFeitos < 6) intervalo = 7; // mês 1
  else intervalo = 20; // meses seguintes
  return addDays(base, intervalo);
}

export function descricaoCadencia(qtdFeitos: number): string {
  if (qtdFeitos < 3) return "Semana 1 — contato a cada 2 dias";
  if (qtdFeitos < 6) return "Mês 1 — 1 contato por semana";
  return "Follow-up mensal — 1 a 2 contatos por mês";
}
