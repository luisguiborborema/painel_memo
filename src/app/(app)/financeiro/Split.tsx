"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Contrato } from "@/lib/types";
import { SPLIT_IMPOSTOS, SPLIT_CAIXA, SPLIT_SOCIOS } from "@/lib/constants";
import { brl, formatData } from "@/lib/format";

type EquipeMini = { valor: number; is_freelancer: boolean };
type OpMini = { contrato_id: string; operacao_equipe: EquipeMini[] };

function calcSplit(receita: number, custoFree: number, modo: "padrao" | "igual") {
  const impostos = receita * SPLIT_IMPOSTOS;
  const caixa = receita * SPLIT_CAIXA;
  const lucro = receita - impostos - caixa - custoFree;
  const socios = SPLIT_SOCIOS[modo];
  const distrib = Object.entries(socios).map(([nome, pct]) => ({
    nome,
    pct,
    valor: lucro * pct,
  }));
  return { impostos, caixa, lucro, distrib };
}

export function Split() {
  const supabase = createClient();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [freePorContrato, setFreePorContrato] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: ops }] = await Promise.all([
        supabase.from("contratos").select("*").order("created_at", { ascending: false }),
        supabase.from("operacao_cards").select("contrato_id, operacao_equipe(valor, is_freelancer)"),
      ]);
      const map: Record<string, number> = {};
      for (const op of (ops as OpMini[]) ?? []) {
        const soma = (op.operacao_equipe ?? [])
          .filter((e) => e.is_freelancer)
          .reduce((s, e) => s + Number(e.valor), 0);
        map[op.contrato_id] = (map[op.contrato_id] ?? 0) + soma;
      }
      setContratos((cs as Contrato[]) ?? []);
      setFreePorContrato(map);
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  if (loading) return <p className="text-sm text-neutral-400">Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">
        Estimativa <strong>por evento</strong> (12% de imposto como aproximação por contrato). A
        cascata: receita − 12% impostos − 10% caixa − custo de freelancers = lucro líquido.
        Para fechamento fiscal, o imposto real incide sobre o faturamento mensal (ver aba Pagar).
      </p>

      {contratos.map((c) => {
        const custoFree = freePorContrato[c.id] ?? 0;
        const { impostos, caixa, lucro, distrib } = calcSplit(Number(c.valor_total), custoFree, c.split_modo);
        return (
          <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-neutral-800">{c.noivo1_nome} & {c.noivo2_nome}</div>
                <div className="text-xs text-neutral-400">{formatData(c.data_evento)} · {c.split_modo === "padrao" ? "40/40/20" : "partes iguais"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-400">Lucro líquido</div>
                <div className="text-lg font-bold text-green-600">{brl(lucro)}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 border-b border-neutral-100 pb-3 text-sm">
              <Linha label="Receita" v={brl(c.valor_total)} />
              <Linha label="− Impostos (12%)" v={brl(impostos)} neg />
              <Linha label="− Caixa (10%)" v={brl(caixa)} neg />
              <Linha label="− Freelancers" v={brl(custoFree)} neg />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {distrib.map((d) => (
                <div key={d.nome} className="rounded-lg bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-400">{d.nome} · {(d.pct * 100).toFixed(0).replace(".0", "")}%</div>
                  <div className="text-base font-bold text-neutral-800">{brl(d.valor)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {contratos.length === 0 && <p className="text-sm text-neutral-400">Nenhum contrato fechado ainda.</p>}
    </div>
  );
}

function Linha({ label, v, neg }: { label: string; v: string; neg?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className={`font-medium ${neg ? "text-red-500" : "text-neutral-700"}`}>{v}</div>
    </div>
  );
}
