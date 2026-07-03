"use client";

import type { Lead } from "@/lib/types";
import { SERVICO_MAP } from "@/lib/constants";
import { formatData } from "@/lib/format";
import { avaliarData, DISP_UI, type Disponibilidade } from "@/lib/agenda";
import type { AgendaItem } from "@/lib/types";
import { Chip } from "@/components/ui";

export function LeadCard({
  lead,
  agenda,
  onClick,
}: {
  lead: Lead;
  agenda: AgendaItem[];
  onClick: () => void;
}) {
  const disp: Disponibilidade = avaliarData(lead.data_casamento, agenda, lead.id);
  const ui = DISP_UI[disp.estado];
  const feitos = lead.checklist.filter((c) => c.done).length;

  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight text-neutral-800">
          {lead.nome_casal}
        </h3>
        {lead.data_casamento && (
          <span className="shrink-0 text-[11px] font-medium text-neutral-400">
            {formatData(lead.data_casamento)}
          </span>
        )}
      </div>

      {lead.data_casamento && disp.estado !== "vazio" && (
        <div
          className={`mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${ui.classe}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
          {disp.estado === "livre" ? "Livre" : disp.estado === "fechada" ? "Fechada" : `Em disputa (${disp.disputas})`}
        </div>
      )}

      {lead.servicos_interesse.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.servicos_interesse.map((s) => {
            const meta = SERVICO_MAP[s];
            return (
              <Chip key={s} className={meta?.cor ?? "bg-neutral-100 text-neutral-600 border-neutral-200"}>
                {meta?.label ?? s}
              </Chip>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
        {lead.local && <span className="truncate">📍 {lead.local}</span>}
        <span className="ml-auto shrink-0">
          ✓ {feitos}/{lead.checklist.length}
        </span>
      </div>
    </div>
  );
}
