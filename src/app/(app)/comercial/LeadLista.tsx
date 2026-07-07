"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";
import { LEAD_COLUNAS, SERVICO_MAP } from "@/lib/constants";
import { PORTE_MAP, valorServicos } from "@/lib/porte";
import { formatData, brl } from "@/lib/format";

type Col = "casal" | "etapa" | "data" | "porte" | "valor" | "tarefa";

const LABEL = Object.fromEntries(LEAD_COLUNAS.map((c) => [c.key, c.label]));

export function LeadLista({ leads, onSelect }: { leads: Lead[]; onSelect: (l: Lead) => void }) {
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: "data", dir: 1 });

  function val(l: Lead, c: Col): string | number {
    switch (c) {
      case "casal": return l.nome_casal.toLowerCase();
      case "etapa": return LEAD_COLUNAS.findIndex((x) => x.key === l.coluna_atual);
      case "data": return l.data_casamento ?? "9999";
      case "porte": return l.porte ?? "";
      case "valor": return valorServicos(l.servicos);
      case "tarefa": return l.proxima_atividade_data ?? "9999";
    }
  }

  const ordenados = [...leads].sort((a, b) => {
    const va = val(a, sort.col), vb = val(b, sort.col);
    if (va < vb) return -1 * sort.dir;
    if (va > vb) return 1 * sort.dir;
    return 0;
  });

  function th(col: Col, label: string, extra = "") {
    const active = sort.col === col;
    return (
      <th
        className={`cursor-pointer px-4 py-2 font-medium select-none hover:text-neutral-700 ${extra}`}
        onClick={() => setSort((s) => ({ col, dir: s.col === col && s.dir === 1 ? -1 : 1 }))}
      >
        {label} {active && (sort.dir === 1 ? "↑" : "↓")}
      </th>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-400">
            <tr>
              {th("casal", "Casal")}
              {th("etapa", "Etapa")}
              {th("data", "Data")}
              {th("porte", "Porte")}
              {th("valor", "Valor", "text-right")}
              {th("tarefa", "Próxima tarefa")}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {ordenados.map((l) => {
              const porte = l.porte ? PORTE_MAP[l.porte] : null;
              const valor = valorServicos(l.servicos);
              return (
                <tr key={l.id} onClick={() => onSelect(l)} className="cursor-pointer hover:bg-neutral-50">
                  <td className="px-4 py-2 font-medium text-neutral-800">{l.nome_casal}</td>
                  <td className="px-4 py-2 text-neutral-500">{LABEL[l.coluna_atual]}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatData(l.data_casamento)}</td>
                  <td className="px-4 py-2">
                    {porte ? <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${porte.cor}`}>{porte.label}</span> : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-neutral-700">{valor > 0 ? brl(valor) : "—"}</td>
                  <td className="px-4 py-2">
                    {l.proxima_atividade_data ? (
                      <span className="text-neutral-600">{formatData(l.proxima_atividade_data)}{l.proxima_atividade_desc ? ` · ${l.proxima_atividade_desc}` : ""}</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Sem tarefa</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {ordenados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">Nenhuma negociação.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
