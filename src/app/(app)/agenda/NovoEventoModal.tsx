"use client";

import { useState } from "react";
import { criarEventoGoogle } from "@/lib/google/client";
import { Button, Input, Modal, Textarea } from "@/components/ui";

export function NovoEventoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [local, setLocal] = useState("");
  const [participantes, setParticipantes] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function reset() {
    setTitulo(""); setData(""); setDiaInteiro(true); setHoraInicio(""); setHoraFim("");
    setLocal(""); setParticipantes(""); setDescricao(""); setErro(null);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !data) return;
    if (!diaInteiro && !horaInicio) {
      setErro("Informe a hora de início ou marque 'dia inteiro'.");
      return;
    }
    setSaving(true);
    setErro(null);
    const r = await criarEventoGoogle({
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
      setErro(r.error ?? "Não foi possível criar o evento.");
      return;
    }
    reset();
    onCreated();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo evento na agenda">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 border border-sky-200">
          O evento é criado no Google Agenda da MEMO e aparece aqui em azul.
        </p>
        <Input label="Título *" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus required placeholder="Ex: Reunião de alinhamento" />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Data *" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
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

        <Textarea
          label="Participantes (um por linha ou separados por vírgula)"
          rows={2}
          value={participantes}
          onChange={(e) => setParticipantes(e.target.value)}
          placeholder={"Iago\nFlávio\nCaio"}
        />
        <Textarea label="Descrição" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Criando..." : "Criar evento"}</Button>
        </div>
      </form>
    </Modal>
  );
}
