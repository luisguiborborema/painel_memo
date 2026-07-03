"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OPERACAO_CHECKLISTS } from "@/lib/constants";
import { Button, Input, Modal } from "@/components/ui";

export function NovoOperacaoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [noivo1, setNoivo1] = useState("");
  const [noivo2, setNoivo2] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [local, setLocal] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setNoivo1(""); setNoivo2(""); setDataEvento(""); setLocal(""); setTelefone(""); setValorTotal("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!noivo1.trim()) return;
    setSaving(true);

    const { data: contrato, error } = await supabase
      .from("contratos")
      .insert({
        noivo1_nome: noivo1.trim(),
        noivo2_nome: noivo2.trim() || "—",
        data_evento: dataEvento || null,
        local: local || null,
        telefone: telefone || null,
        valor_total: Number(valorTotal) || 0,
        valor_sinal: Math.round((Number(valorTotal) || 0) * 0.3 * 100) / 100,
      })
      .select("id")
      .single();

    if (error || !contrato) {
      setSaving(false);
      alert("Erro ao criar: " + error?.message);
      return;
    }

    await supabase.from("operacao_cards").insert({
      contrato_id: contrato.id,
      coluna_atual: "onboarding",
      checklists: OPERACAO_CHECKLISTS,
    });

    setSaving(false);
    reset();
    onCreated();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo card de operação">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">
          Criação manual (sem passar pela passagem de bastão). Útil para cadastrar um evento
          que já estava em produção. Depois é só editar os dados e serviços dentro do card.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Noivo(a) 1 *" value={noivo1} onChange={(e) => setNoivo1(e.target.value)} autoFocus required />
          <Input label="Noivo(a) 2" value={noivo2} onChange={(e) => setNoivo2(e.target.value)} />
          <Input label="Data do evento" type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
          <Input label="Local" value={local} onChange={(e) => setLocal(e.target.value)} />
          <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <Input label="Valor total (R$)" type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Criando..." : "Criar card"}</Button>
        </div>
      </form>
    </Modal>
  );
}
