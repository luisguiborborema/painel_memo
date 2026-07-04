"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgendaItem } from "@/lib/types";
import { formatData } from "@/lib/format";
import { deleteEventoGoogle, editarEventoGoogle } from "@/lib/google/client";
import { Button, Input, Modal, Textarea } from "@/components/ui";

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
  const isGoogle = evento.tipo === "google";

  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // form (edição de evento Google)
  const [titulo, setTitulo] = useState(evento.titulo);
  const [data, setData] = useState(evento.data?.slice(0, 10) ?? "");
  const [diaInteiro, setDiaInteiro] = useState(evento.allDay ?? true);
  const [horaInicio, setHoraInicio] = useState(evento.horaInicio ?? "");
  const [horaFim, setHoraFim] = useState(evento.horaFim ?? "");
  const [local, setLocal] = useState(evento.local ?? "");
  const [participantes, setParticipantes] = useState((evento.participantes ?? []).join("\n"));
  const [descricao, setDescricao] = useState(evento.descricao ?? "");

  async function excluirGoogle() {
    if (!confirm(`Excluir o evento "${evento.titulo}" do Google Agenda?`)) return;
    await deleteEventoGoogle(evento.ref_id);
    onChange();
    onClose();
  }

  async function salvar() {
    if (!titulo.trim() || !data) return;
    setSaving(true);
    setErro(null);
    const r = await editarEventoGoogle(evento.ref_id, {
      titulo: titulo.trim(),
      data,
      allDay: diaInteiro,
      horaInicio: horaInicio || undefined,
      horaFim: horaFim || undefined,
      local,
      descricao,
      participantes: participantes.split(/[\n,]/).map((p) => p.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!r.ok) {
      setErro(r.error ?? "Não foi possível salvar.");
      return;
    }
    onChange();
    onClose();
  }

  const horarioTxt = evento.allDay === false && evento.horaInicio
    ? `${evento.horaInicio}${evento.horaFim ? ` – ${evento.horaFim}` : ""}`
    : "Dia inteiro";

  return (
    <Modal open onClose={onClose} title={editando ? "Editar evento" : evento.titulo}>
      {isGoogle && editando ? (
        <div className="flex flex-col gap-3">
          <Input label="Título *" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <Input label="Local" value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} />
            Dia inteiro
          </label>
          {!diaInteiro && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Início" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
              <Input label="Fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          )}
          <Textarea label="Participantes (um por linha ou vírgula)" rows={2} value={participantes} onChange={(e) => setParticipantes(e.target.value)} />
          <Textarea label="Descrição" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditando(false)}>Voltar</Button>
            <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${ui.classe}`}>
            {ui.label}
          </span>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Campo label="Data" v={formatData(evento.data)} />
            {isGoogle && <Campo label="Horário" v={horarioTxt} />}
            {evento.local && <Campo label="Local" v={`📍 ${evento.local}`} />}
          </div>

          {isGoogle && evento.participantes && evento.participantes.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] text-neutral-400">Participantes</div>
              <div className="flex flex-wrap gap-1.5">
                {evento.participantes.map((p, i) => (
                  <span key={i} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isGoogle && evento.descricao && (
            <div>
              <div className="mb-1 text-[11px] text-neutral-400">Descrição</div>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{evento.descricao}</p>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3">
            {isGoogle ? (
              <Button variant="ghost" onClick={excluirGoogle} className="text-red-600 hover:bg-red-50">
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {isGoogle && (
                <>
                  {evento.link && (
                    <a href={evento.link} target="_blank" rel="noreferrer">
                      <Button variant="outline">Abrir no Google</Button>
                    </a>
                  )}
                  <Button onClick={() => setEditando(true)}>Editar</Button>
                </>
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
      )}
    </Modal>
  );
}

function Campo({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className="font-medium text-neutral-700">{v}</div>
    </div>
  );
}
