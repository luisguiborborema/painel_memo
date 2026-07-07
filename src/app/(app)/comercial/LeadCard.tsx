"use client";

import type { Lead, AgendaItem } from "@/lib/types";
import { SERVICO_MAP } from "@/lib/constants";
import { PORTE_MAP, valorServicos } from "@/lib/porte";
import { formatData, brl } from "@/lib/format";
import { avaliarData, DISP_UI, type Disponibilidade } from "@/lib/agenda";
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
  const porte = lead.porte ? PORTE_MAP[lead.porte] : null;
  const valor = valorServicos(lead.servicos);
  // serviços: usa a lista nova (com valor); cai para a antiga se ainda não migrado
  const servicosNomes =
    lead.servicos && lead.servicos.length > 0
      ? lead.servicos.map((s) => s.nome)
      : lead.servicos_interesse.map((k) => SERVICO_MAP[k]?.label ?? k);

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

      {(porte || servicosNomes.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {porte && (
            <Chip className={porte.cor}>{porte.label}</Chip>
          )}
          {servicosNomes.map((nome) => (
            <Chip key={nome} className="bg-neutral-100 text-neutral-600 border-neutral-200">
              {nome}
            </Chip>
          ))}
        </div>
      )}

      {/* Próxima atividade / Sem tarefa */}
      {lead.proxima_atividade_data ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-neutral-50 px-2 py-1 text-[11px] text-neutral-600">
          <span>🗓️</span>
          <span className="font-medium">{formatData(lead.proxima_atividade_data)}</span>
          {lead.proxima_atividade_desc && (
            <span className="truncate text-neutral-400">· {lead.proxima_atividade_desc}</span>
          )}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
          <span>⚠️</span> Sem tarefa
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
        {lead.num_convidados != null && <span>👥 {lead.num_convidados}</span>}
        {lead.local && <span className="truncate">📍 {lead.local}</span>}
        {valor > 0 && <span className="ml-auto shrink-0 font-medium text-neutral-500">{brl(valor)}</span>}
      </div>
    </div>
  );
}
