import { addDays } from "./format";

export type ModeloPagamento = "a_vista" | "entrada_50_50" | "sinal_30_parcelado";

export const MODELOS_PAGAMENTO: { key: ModeloPagamento; label: string }[] = [
  { key: "a_vista", label: "À vista (com desconto)" },
  { key: "entrada_50_50", label: "50% entrada + 50% no mês do evento" },
  { key: "sinal_30_parcelado", label: "30% sinal + saldo parcelado" },
];

// Valor efetivo do contrato (à vista aplica desconto).
export function valorEfetivo(modelo: ModeloPagamento, total: number, desconto: number): number {
  return modelo === "a_vista" ? Math.max(0, total - (desconto || 0)) : total;
}

export type ReceberGerado = {
  descricao: string;
  valor: number;
  vencimento: string;
  status: "pago" | "a_vencer";
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Gera as contas a receber conforme o modelo de pagamento.
export function gerarReceber(params: {
  modelo: ModeloPagamento;
  total: number;
  desconto?: number;
  numParcelas?: number;
  dataEvento?: string | null;
  hoje: string;
}): ReceberGerado[] {
  const { modelo, total, hoje } = params;
  const desconto = params.desconto ?? 0;
  const dataEvento = params.dataEvento || addDays(hoje, 180);

  if (modelo === "a_vista") {
    return [
      { descricao: "À vista (assinatura)", valor: valorEfetivo("a_vista", total, desconto), vencimento: hoje, status: "pago" },
    ];
  }

  if (modelo === "entrada_50_50") {
    const entrada = round2(total * 0.5);
    return [
      { descricao: "Entrada (50% na assinatura)", valor: entrada, vencimento: hoje, status: "pago" },
      { descricao: "Saldo (50% no mês do evento)", valor: round2(total - entrada), vencimento: dataEvento, status: "a_vencer" },
    ];
  }

  // sinal_30_parcelado
  const sinal = round2(total * 0.3);
  const saldo = round2(total - sinal);
  const n = Math.max(1, params.numParcelas ?? 3);
  const parc = round2(saldo / n);
  const rows: ReceberGerado[] = [
    { descricao: "Sinal (30% na assinatura)", valor: sinal, vencimento: hoje, status: "pago" },
  ];
  for (let i = 0; i < n; i++) {
    rows.push({
      descricao: `Parcela ${i + 1}/${n} (saldo)`,
      valor: i === n - 1 ? round2(saldo - parc * (n - 1)) : parc,
      vencimento: addDays(hoje, 30 * (i + 1)),
      status: "a_vencer",
    });
  }
  return rows;
}
