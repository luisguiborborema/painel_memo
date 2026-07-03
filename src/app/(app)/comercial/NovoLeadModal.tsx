"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { SERVICOS, ORIGENS } from "@/lib/constants";
import { avaliarData, DISP_UI } from "@/lib/agenda";
import type { AgendaItem } from "@/lib/types";

export function NovoLeadModal({
  open,
  onClose,
  agenda,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  agenda: AgendaItem[];
  onCreated: (leadId: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [convidados, setConvidados] = useState("");
  const [local, setLocal] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origem, setOrigem] = useState("instagram");
  const [servicos, setServicos] = useState<string[]>([]);
  const [anotacao, setAnotacao] = useState("");
  const [saving, setSaving] = useState(false);

  const disp = avaliarData(data || null, agenda);
  const ui = DISP_UI[disp.estado];

  function toggleServico(k: string) {
    setServicos((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  }

  function reset() {
    setNome(""); setData(""); setConvidados(""); setLocal("");
    setWhatsapp(""); setOrigem("instagram"); setServicos([]); setAnotacao("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        nome_casal: nome.trim(),
        data_casamento: data || null,
        num_convidados: convidados ? Number(convidados) : null,
        local: local || null,
        whatsapp: whatsapp || null,
        origem,
        servicos_interesse: servicos,
      })
      .select("id")
      .single();

    if (!error && lead) {
      if (anotacao.trim()) {
        await supabase.from("lead_anotacoes").insert({
          lead_id: lead.id,
          texto: anotacao.trim(),
        });
      }
      reset();
      onCreated(lead.id);
    }
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo lead" wide>
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <Input
          label="Nome do casal *"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Marina & Rafael"
          autoFocus
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Data do casamento"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
            {data && disp.estado !== "vazio" && (
              <div
                className={`mt-1.5 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${ui.classe}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
                {ui.label(disp)}
              </div>
            )}
          </div>
          <Input
            label="Nº de convidados"
            type="number"
            value={convidados}
            onChange={(e) => setConvidados(e.target.value)}
          />
        </div>

        <Input
          label="Local (cerimônia/festa)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(00) 00000-0000"
          />
          <Select
            label="Origem"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
          >
            {ORIGENS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-neutral-600">
            Serviços de interesse
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SERVICOS.map((s) => {
              const on = servicos.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleServico(s.key)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    on ? s.cor : "border-neutral-200 bg-white text-neutral-400"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          label="Anotação inicial"
          rows={2}
          value={anotacao}
          onChange={(e) => setAnotacao(e.target.value)}
        />

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Criar lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
