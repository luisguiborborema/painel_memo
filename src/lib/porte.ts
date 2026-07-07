import type { Porte, ServicoValor } from "./types";

export const PORTES: { key: Porte; label: string; cor: string }[] = [
  { key: "intimista", label: "Intimista", cor: "bg-rose-100 text-rose-700 border-rose-200" },
  { key: "mini_wedding", label: "Mini Wedding", cor: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "classico", label: "Clássico", cor: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { key: "especial", label: "Especial", cor: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
];

export const PORTE_MAP = Object.fromEntries(PORTES.map((p) => [p.key, p]));

// Sugestão determinística por nº de convidados (arredonda para cima entre faixas).
// Limites a confirmar com o Iago (PRD V2 §2.3): ≤80 · 81–150 · 151–200 · >200.
export function sugestaoPorte(convidados: number | null | undefined): Porte | null {
  if (convidados == null || convidados <= 0) return null;
  if (convidados <= 80) return "intimista";
  if (convidados <= 150) return "mini_wedding";
  if (convidados <= 200) return "classico";
  return "especial";
}

// Soma dos valores dos serviços de um lead (base do forecast e subtotais).
export function valorServicos(servicos: ServicoValor[] | null | undefined): number {
  if (!servicos) return 0;
  return servicos.reduce((s, x) => s + (Number(x.valor) || 0), 0);
}
