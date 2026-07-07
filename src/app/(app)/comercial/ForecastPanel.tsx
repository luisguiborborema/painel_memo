"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { LEAD_COLUNAS } from "@/lib/constants";
import { useServicos } from "@/lib/useServicos";
import { valorServicos } from "@/lib/porte";
import { brl } from "@/lib/format";

// Forecast do pipeline: total + quebra por produto (R$ e nº de cards).
export function ForecastPanel({ leads }: { leads: Lead[] }) {
  const { servicos } = useServicos();
  const [etapa, setEtapa] = useState<string>("todas");
  const [aberto, setAberto] = useState(true);

  const filtrados = useMemo(
    () => (etapa === "todas" ? leads : leads.filter((l) => l.coluna_atual === etapa)),
    [leads, etapa]
  );

  const total = filtrados.reduce((s, l) => s + valorServicos(l.servicos), 0);

  const porProduto = useMemo(() => {
    const map = new Map<string, { valor: number; cards: number }>();
    for (const l of filtrados) {
      for (const s of l.servicos ?? []) {
        const cur = map.get(s.nome) ?? { valor: 0, cards: 0 };
        cur.valor += Number(s.valor) || 0;
        cur.cards += 1;
        map.set(s.nome, cur);
      }
    }
    // ordena pela ordem configurada; produtos fora da lista vão ao fim
    const ordem = new Map(servicos.map((s, i) => [s.nome, i]));
    return [...map.entries()]
      .map(([nome, v]) => ({ nome, ...v, cor: servicos.find((s) => s.nome === nome)?.cor }))
      .sort((a, b) => (ordem.get(a.nome) ?? 99) - (ordem.get(b.nome) ?? 99));
  }, [filtrados, servicos]);

  return (
    <div className="border-b border-neutral-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <button onClick={() => setAberto((a) => !a)} className="text-xs text-neutral-400 hover:text-neutral-600">
          {aberto ? "▾" : "▸"}
        </button>
        <div>
          <div className="text-[11px] text-neutral-400">Pipeline {etapa === "todas" ? "total" : "da etapa"}</div>
          <div className="text-lg font-bold text-neutral-800">
            {brl(total)} <span className="text-xs font-normal text-neutral-400">· {filtrados.length} negociação(ões)</span>
          </div>
        </div>
        <select
          value={etapa}
          onChange={(e) => setEtapa(e.target.value)}
          className="ml-auto rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-900"
        >
          <option value="todas">Todas as etapas</option>
          {LEAD_COLUNAS.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      {aberto && porProduto.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {porProduto.map((p) => (
            <div key={p.nome} className="rounded-lg border border-neutral-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-600">{p.nome}</span>
                <span className="text-[10px] text-neutral-400">{p.cards}</span>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-neutral-800">{brl(p.valor)}</div>
            </div>
          ))}
        </div>
      )}
      {aberto && porProduto.length === 0 && (
        <p className="mt-2 text-xs text-neutral-400">Sem valores de serviço lançados ainda. Preencha os valores nos cards.</p>
      )}
    </div>
  );
}
