import type { AgendaItem } from "./types";

export type DispEstado = "livre" | "disputa" | "fechada" | "vazio";

export type Disponibilidade = {
  estado: DispEstado;
  disputas: number; // quantas outras negociações na mesma data
  fechado?: AgendaItem;
};

// Avalia a disponibilidade de uma data cruzando os itens da agenda.
// `ignoreLeadId` exclui o próprio lead da contagem de disputas.
export function avaliarData(
  data: string | null,
  agenda: AgendaItem[],
  ignoreLeadId?: string
): Disponibilidade {
  if (!data) return { estado: "vazio", disputas: 0 };
  const dia = data.split("T")[0];
  const naData = agenda.filter((a) => a.data?.split("T")[0] === dia);

  const fechado = naData.find((a) => a.tipo === "fechado");
  if (fechado) return { estado: "fechada", disputas: 0, fechado };

  const negociacoes = naData.filter(
    (a) => a.tipo === "negociacao" && a.ref_id !== ignoreLeadId
  );
  if (negociacoes.length > 0)
    return { estado: "disputa", disputas: negociacoes.length };

  return { estado: "livre", disputas: 0 };
}

export const DISP_UI: Record<
  DispEstado,
  { label: (d: Disponibilidade) => string; classe: string; dot: string }
> = {
  livre: {
    label: () => "Data livre na agenda",
    classe: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  disputa: {
    label: (d) =>
      `Já existe ${d.disputas} negociação${d.disputas > 1 ? "ões" : ""} para esta data`,
    classe: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  fechada: {
    label: () => "Agenda FECHADA para esta data",
    classe: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  vazio: {
    label: () => "Sem data informada",
    classe: "bg-neutral-50 text-neutral-400 border-neutral-200",
    dot: "bg-neutral-300",
  },
};
