import type { SocioConfig } from "./types";

export const FIN_CONFIG_DEFAULT = {
  imposto_pct: 12,
  caixa_pct: 10,
  socios: [
    { nome: "Flávio", pct: 40 },
    { nome: "Caio", pct: 40 },
    { nome: "Iago", pct: 20 },
  ] as SocioConfig[],
};

// Percentuais são inteiros (12 = 12%). modo:
//  - "padrao": usa os pct de cada sócio como configurado
//  - "igual": divide igualmente entre os sócios configurados
export function calcSplit(
  receita: number,
  custoFree: number,
  cfg: { imposto_pct: number; caixa_pct: number; socios: SocioConfig[] },
  modo: "padrao" | "igual" = "padrao"
) {
  const impostos = receita * (cfg.imposto_pct / 100);
  const caixa = receita * (cfg.caixa_pct / 100);
  const lucro = receita - impostos - caixa - custoFree;

  const n = cfg.socios.length || 1;
  const distrib = cfg.socios.map((s) => {
    const fracao = modo === "igual" ? 1 / n : s.pct / 100;
    return { nome: s.nome, pct: modo === "igual" ? 100 / n : s.pct, valor: lucro * fracao };
  });

  return { impostos, caixa, lucro, distrib };
}
