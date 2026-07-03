"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinReceber, Contrato, ReceberStatus } from "@/lib/types";
import { brl, formatData, parseDate, toISODate } from "@/lib/format";
import { Button } from "@/components/ui";

type Row = FinReceber & { contrato: Pick<Contrato, "noivo1_nome" | "noivo2_nome"> | null };

function statusReal(r: FinReceber): ReceberStatus {
  if (r.status === "pago") return "pago";
  const venc = parseDate(r.vencimento);
  if (venc && venc < new Date(new Date().toDateString())) return "atrasado";
  return "a_vencer";
}

const STATUS_UI: Record<ReceberStatus, string> = {
  pago: "bg-green-100 text-green-700",
  a_vencer: "bg-neutral-100 text-neutral-500",
  atrasado: "bg-red-100 text-red-700",
};

export function Receber() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const { data } = await supabase
      .from("fin_receber")
      .select("*, contrato:contratos(noivo1_nome, noivo2_nome)")
      .order("vencimento");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  async function togglePago(r: Row) {
    const novo = r.status === "pago" ? "a_vencer" : "pago";
    await supabase.from("fin_receber").update({
      status: novo,
      pago_em: novo === "pago" ? toISODate(new Date()) : null,
    }).eq("id", r.id);
    carregar();
  }

  const totais = useMemo(() => {
    let recebido = 0, aReceber = 0;
    for (const r of rows) {
      if (r.status === "pago") recebido += Number(r.valor);
      else aReceber += Number(r.valor);
    }
    return { recebido, aReceber, total: recebido + aReceber };
  }, [rows]);

  if (loading) return <p className="text-sm text-neutral-400">Carregando...</p>;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card label="Recebido" v={brl(totais.recebido)} cor="text-green-600" />
        <Card label="A receber" v={brl(totais.aReceber)} cor="text-amber-600" />
        <Card label="Total" v={brl(totais.total)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Casal</th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Vencimento</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const st = statusReal(r);
              return (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 font-medium text-neutral-700">
                    {r.contrato ? `${r.contrato.noivo1_nome} & ${r.contrato.noivo2_nome}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{r.descricao}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatData(r.vencimento)}</td>
                  <td className="px-4 py-2 text-right font-medium">{brl(r.valor)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_UI[st]}`}>
                      {st === "a_vencer" ? "A vencer" : st === "pago" ? "Pago" : "Atrasado"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant={r.status === "pago" ? "outline" : "primary"} onClick={() => togglePago(r)}>
                      {r.status === "pago" ? "Desfazer" : "Marcar pago"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">Nenhum lançamento. Gerados na passagem de bastão.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, v, cor = "text-neutral-800" }: { label: string; v: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${cor}`}>{v}</div>
    </div>
  );
}
