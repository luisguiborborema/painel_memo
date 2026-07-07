"use client";

import type { OperacaoCard as OpCard, Contrato, ChecklistItem } from "@/lib/types";
import { formatData, brl } from "@/lib/format";

export type OpCardFull = OpCard & { contrato: Contrato | null };

// Próxima tarefa da etapa atual: primeiro item não concluído do checklist.
// Retorna { label } ou { concluida: true } se tudo feito, ou null se sem checklist.
export function proximaTarefaOp(card: OpCardFull): { label: string } | { concluida: true } | null {
  const checklist: ChecklistItem[] = card.checklists?.[card.coluna_atual] ?? [];
  if (checklist.length === 0) return null;
  const pendente = checklist.find((i) => !i.done);
  return pendente ? { label: pendente.label } : { concluida: true };
}

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
  const tarefa = proximaTarefaOp(card);

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

      {/* Próxima tarefa da etapa / etapa concluída */}
      {tarefa && (
        "concluida" in tarefa ? (
          <div className="mt-2 flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
            <span>✓</span> Etapa concluída
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-neutral-50 px-2 py-1 text-[11px] text-neutral-600">
            <span>🗓️</span>
            <span className="truncate">{tarefa.label}</span>
          </div>
        )
      )}

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

      <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
        {c?.local && <span className="truncate">📍 {c.local}</span>}
        {c && c.valor_total > 0 && (
          <span className="ml-auto shrink-0 font-medium text-neutral-500">{brl(c.valor_total)}</span>
        )}
      </div>
    </div>
  );
}
