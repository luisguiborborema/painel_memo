"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { SERVICO_MAP } from "@/lib/constants";
import { OPERACAO_CHECKLISTS } from "@/lib/constants";
import { brl, addDays } from "@/lib/format";
import { syncContratoGoogle } from "@/lib/google/client";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";

type ServicoRow = { nome: string; valor: string };

export function PassagemBastao({
  lead,
  onClose,
  onDone,
}: {
  lead: Lead;
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = createClient();
  const nomes = lead.nome_casal.split(/\s*[&e/]\s*/i);

  const [noivo1, setNoivo1] = useState(nomes[0] ?? "");
  const [noivo2, setNoivo2] = useState(nomes[1] ?? "");
  const [cpf1, setCpf1] = useState("");
  const [cpf2, setCpf2] = useState("");
  const [profissao, setProfissao] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState(lead.whatsapp ?? "");
  const [endereco, setEndereco] = useState("");
  const [dataEvento, setDataEvento] = useState(lead.data_casamento ?? "");
  const [local, setLocal] = useState(lead.local ?? "");
  const [condicao, setCondicao] = useState("30% na assinatura + saldo em PIX até o mês do evento");
  const [parcelasSaldo, setParcelasSaldo] = useState("3");
  const [splitModo, setSplitModo] = useState<"padrao" | "igual">("padrao");
  const [anotacoesOp, setAnotacoesOp] = useState("");
  const [saving, setSaving] = useState(false);

  const [servicos, setServicos] = useState<ServicoRow[]>(
    lead.servicos_interesse.length
      ? lead.servicos_interesse.map((s) => ({ nome: SERVICO_MAP[s]?.label ?? s, valor: "" }))
      : [{ nome: "", valor: "" }]
  );

  const valorTotal = useMemo(
    () => servicos.reduce((s, r) => s + (Number(r.valor) || 0), 0),
    [servicos]
  );
  const sinal = useMemo(() => Math.round(valorTotal * 0.3 * 100) / 100, [valorTotal]);
  const saldo = Math.round((valorTotal - sinal) * 100) / 100;

  function setServico(i: number, patch: Partial<ServicoRow>) {
    setServicos((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addServico() {
    setServicos((r) => [...r, { nome: "", valor: "" }]);
  }
  function rmServico(i: number) {
    setServicos((r) => r.filter((_, idx) => idx !== i));
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!noivo1.trim() || !noivo2.trim()) {
      alert("Informe o nome dos dois noivos.");
      return;
    }
    setSaving(true);

    // 1. Contrato
    const { data: contrato, error } = await supabase
      .from("contratos")
      .insert({
        lead_id: lead.id,
        noivo1_nome: noivo1.trim(),
        noivo2_nome: noivo2.trim(),
        cpf1: cpf1 || null,
        cpf2: cpf2 || null,
        profissao: profissao || null,
        email: email || null,
        telefone: telefone || null,
        endereco: endereco || null,
        data_evento: dataEvento || null,
        local: local || null,
        valor_total: valorTotal,
        valor_sinal: sinal,
        condicao_pagamento: condicao || null,
        anotacoes_operacao: anotacoesOp || null,
        split_modo: splitModo,
      })
      .select("id")
      .single();

    if (error || !contrato) {
      setSaving(false);
      alert("Erro ao criar contrato: " + error?.message);
      return;
    }

    // 2. Serviços contratados
    const servicosValidos = servicos.filter((s) => s.nome.trim());
    if (servicosValidos.length) {
      await supabase.from("contrato_servicos").insert(
        servicosValidos.map((s) => ({
          contrato_id: contrato.id,
          nome: s.nome.trim(),
          valor: Number(s.valor) || 0,
        }))
      );
    }

    // 3. Card de operação (onboarding) com checklists por etapa
    await supabase.from("operacao_cards").insert({
      contrato_id: contrato.id,
      coluna_atual: "onboarding",
      checklists: OPERACAO_CHECKLISTS,
      anotacoes: anotacoesOp || null,
    });

    // 4. Financeiro — receber: sinal (pago) + saldo parcelado
    const hoje = new Date().toISOString().slice(0, 10);
    const receber: {
      contrato_id: string;
      descricao: string;
      valor: number;
      vencimento: string | null;
      status: "pago" | "a_vencer";
    }[] = [
      {
        contrato_id: contrato.id,
        descricao: "Sinal (30% na assinatura)",
        valor: sinal,
        vencimento: hoje,
        status: "pago",
      },
    ];
    const nParc = Math.max(1, Number(parcelasSaldo) || 1);
    const valorParc = Math.round((saldo / nParc) * 100) / 100;
    for (let i = 0; i < nParc; i++) {
      receber.push({
        contrato_id: contrato.id,
        descricao: `Parcela ${i + 1}/${nParc} (saldo PIX)`,
        valor: i === nParc - 1 ? Math.round((saldo - valorParc * (nParc - 1)) * 100) / 100 : valorParc,
        vencimento: addDays(hoje, 30 * (i + 1)),
        status: "a_vencer",
      });
    }
    await supabase.from("fin_receber").insert(receber);

    // 5. Fecha o lead no comercial (sai do board; agenda passa a contar como "fechado")
    await supabase
      .from("leads")
      .update({ coluna_atual: "fechamento", arquivado: true })
      .eq("id", lead.id);

    // 6. Sincroniza com o Google Agenda (se configurado)
    syncContratoGoogle(contrato.id);

    setSaving(false);
    onDone();
  }

  return (
    <Modal open onClose={onClose} wide title="🤝 Passagem de bastão">
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200">
          Pré-requisito: contrato assinado + sinal de 30% confirmado. Ao confirmar, o card
          vai para a Operação e os lançamentos financeiros são gerados.
        </p>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Dados do contrato</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Noivo(a) 1 *" value={noivo1} onChange={(e) => setNoivo1(e.target.value)} required />
            <Input label="Noivo(a) 2 *" value={noivo2} onChange={(e) => setNoivo2(e.target.value)} required />
            <Input label="CPF 1" value={cpf1} onChange={(e) => setCpf1(e.target.value)} />
            <Input label="CPF 2" value={cpf2} onChange={(e) => setCpf2(e.target.value)} />
            <Input label="Profissão" value={profissao} onChange={(e) => setProfissao(e.target.value)} />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            <Input label="Data do evento" type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Endereço completo" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            <Input label="Local do evento" value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-700">Serviços contratados</h3>
            <Button type="button" size="sm" variant="subtle" onClick={addServico}>+ Item</Button>
          </div>
          <div className="flex flex-col gap-2">
            {servicos.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={s.nome}
                  onChange={(e) => setServico(i, { nome: e.target.value })}
                  placeholder="Ex: Cobertura fotográfica"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
                <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
                  <span className="text-xs text-neutral-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={s.valor}
                    onChange={(e) => setServico(i, { valor: e.target.value })}
                    placeholder="0,00"
                    className="w-28 px-2 py-2 text-sm outline-none"
                  />
                </div>
                <button type="button" onClick={() => rmServico(i)} className="text-neutral-300 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Textarea label="Condição de pagamento" rows={2} value={condicao} onChange={(e) => setCondicao(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nº parcelas do saldo" type="number" min={1} value={parcelasSaldo} onChange={(e) => setParcelasSaldo(e.target.value)} />
            <Select label="Split de lucro" value={splitModo} onChange={(e) => setSplitModo(e.target.value as "padrao" | "igual")}>
              <option value="padrao">Padrão (40/40/20)</option>
              <option value="igual">Partes iguais</option>
            </Select>
          </div>
        </section>

        <Textarea label="Anotações para a operação" rows={2} value={anotacoesOp} onChange={(e) => setAnotacoesOp(e.target.value)} placeholder="Preferências do casal, restrições do local..." />

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-3 text-sm">
          <div><div className="text-xs text-neutral-400">Valor total</div><div className="font-semibold">{brl(valorTotal)}</div></div>
          <div><div className="text-xs text-neutral-400">Sinal (30%)</div><div className="font-semibold text-green-600">{brl(sinal)}</div></div>
          <div><div className="text-xs text-neutral-400">Saldo a receber</div><div className="font-semibold">{brl(saldo)}</div></div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-500">
            {saving ? "Processando..." : "Confirmar passagem de bastão"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
