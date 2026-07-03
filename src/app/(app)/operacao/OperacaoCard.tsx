"use client";

import type { OperacaoCard as OpCard, Contrato } from "@/lib/types";
import { formatData } from "@/lib/format";

export type OpCardFull = OpCard & { contrato: Contrato | null };

export function OperacaoCard({
  card,
  onClick,
}: {
  card: OpCardFull;
  onClick: () => void;
}) {
  const c = card.contrato;
  const titulo = c ? `${c.noivo1_nome} & ${c.noivo2_nome}` : "Casal";
  const checklist = card.checklists?.[card.coluna_atual] ?? [];
  const feitos = checklist.filter((i) => i.done).length;

  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight text-neutral-800">{titulo}</h3>
        {c?.data_evento && (
          <span className="shrink-0 text-[11px] font-medium text-neutral-400">
            {formatData(c.data_evento)}
          </span>
        )}
      </div>
      {c?.local && <p className="mt-1 truncate text-[11px] text-neutral-400">📍 {c.local}</p>}
      {checklist.length > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(feitos / checklist.length) * 100}%` }}
            />
          </div>
          <span className="mt-1 block text-[11px] text-neutral-400">
            {feitos}/{checklist.length} desta etapa
          </span>
        </div>
      )}
    </div>
  );
}
