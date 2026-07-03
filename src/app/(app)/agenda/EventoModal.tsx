"use client";

import { useRouter } from "next/navigation";
import type { AgendaItem } from "@/lib/types";
import { formatData } from "@/lib/format";
import { deleteEventoGoogle } from "@/lib/google/client";
import { Button, Modal } from "@/components/ui";

const TIPO_UI: Record<AgendaItem["tipo"], { label: string; classe: string }> = {
  fechado: { label: "Casamento fechado", classe: "bg-red-100 text-red-700" },
  negociacao: { label: "Negociação em aberto", classe: "bg-amber-100 text-amber-700" },
  google: { label: "Google Agenda", classe: "bg-sky-100 text-sky-700" },
};

export function EventoModal({
  evento,
  onClose,
  onChange,
}: {
  evento: AgendaItem;
  onClose: () => void;
  onChange: () => void;
}) {
  const router = useRouter();
  const ui = TIPO_UI[evento.tipo];

  async function excluirGoogle() {
    if (!confirm(`Excluir o evento "${evento.titulo}" do Google Agenda?`)) return;
    await deleteEventoGoogle(evento.ref_id);
    onChange();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={evento.titulo}>
      <div className="flex flex-col gap-3">
        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${ui.classe}`}>
          {ui.label}
        </span>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[11px] text-neutral-400">Data</div>
            <div className="font-medium text-neutral-700">{formatData(evento.data)}</div>
          </div>
          {evento.local && (
            <div>
              <div className="text-[11px] text-neutral-400">Local</div>
              <div className="font-medium text-neutral-700">📍 {evento.local}</div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3">
          {evento.tipo === "google" ? (
            <Button variant="ghost" onClick={excluirGoogle} className="text-red-600 hover:bg-red-50">
              Excluir do Google
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            {evento.tipo === "google" && evento.link && (
              <a href={evento.link} target="_blank" rel="noreferrer">
                <Button variant="outline">Abrir no Google</Button>
              </a>
            )}
            {evento.tipo === "fechado" && (
              <Button onClick={() => router.push("/operacao")}>Ver na Operação</Button>
            )}
            {evento.tipo === "negociacao" && (
              <Button onClick={() => router.push("/comercial")}>Ver no Comercial</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
