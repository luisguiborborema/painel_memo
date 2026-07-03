export function brl(v: number | null | undefined): string {
  return (v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Converte "2026-07-03" (date) para Date local sem fuso surpresa
export function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const [y, m, day] = d.split("T")[0].split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

export function formatData(d: string | null | undefined): string {
  const date = parseDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function formatDataHora(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// yyyy-mm-dd de um Date
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// Preenche variáveis {nome_casal}, {data}, {link_proposta} em templates
export function preencheTemplate(
  corpo: string,
  vars: Record<string, string | null | undefined>
): string {
  return corpo.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v == null || v === "" ? `{${k}}` : String(v);
  });
}
