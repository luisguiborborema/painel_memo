"use client";

import { useState } from "react";
import { OPERACAO_COLUNAS } from "@/lib/constants";
import { formatData, brl } from "@/lib/format";
import { proximaTarefaOp, type OpCardFull } from "./OperacaoCard";

type Col = "casal" | "etapa" | "data" | "local" | "valor" | "tarefa";

const LABEL = Object.fromEntries(OPERACAO_COLUNAS.map((c) => [c.key, c.label]));

export function OperacaoLista({ cards, onSelect }: { cards: OpCardFull[]; onSelect: (c: OpCardFull) => void }) {
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: "data", dir: 1 });

  function val(card: OpCardFull, col: Col): string | number {
    const c = card.contrato;
    switch (col) {
      case "casal": return c ? `${c.noivo1_nome} ${c.noivo2_nome}`.toLowerCase() : "";
      case "etapa": return OPERACAO_COLUNAS.findIndex((x) => x.key === card.coluna_atual);
      case "data": return c?.data_evento ?? "9999";
      case "local": return (c?.local ?? "").toLowerCase();
      case "valor": return c?.valor_total ?? 0;
      case "tarefa": {
        const t = proximaTarefaOp(card);
        return t && "label" in t ? t.label.toLowerCase() : "zzz";
      }
    }
  }

  const ordenados = [...cards].sort((a, b) => {
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
              {th("local", "Local")}
              {th("valor", "Valor", "text-right")}
              {th("tarefa", "Próxima tarefa")}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {ordenados.map((card) => {
              const c = card.contrato;
              const t = proximaTarefaOp(card);
              return (
                <tr key={card.id} onClick={() => onSelect(card)} className="cursor-pointer hover:bg-neutral-50">
                  <td className="px-4 py-2 font-medium text-neutral-800">{c ? `${c.noivo1_nome} & ${c.noivo2_nome}` : "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{LABEL[card.coluna_atual]}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatData(c?.data_evento)}</td>
                  <td className="px-4 py-2 text-neutral-500">{c?.local ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium text-neutral-700">{c && c.valor_total > 0 ? brl(c.valor_total) : "—"}</td>
                  <td className="px-4 py-2">
                    {t == null ? (
                      <span className="text-neutral-300">—</span>
                    ) : "concluida" in t ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">Etapa concluída</span>
                    ) : (
                      <span className="text-neutral-600">{t.label}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {ordenados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">Nenhum card em produção.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
