"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, SocioConfig } from "@/lib/types";
import { OPERACAO_CHECKLISTS } from "@/lib/constants";
import { brl, addDays } from "@/lib/format";
import { calcSplit, FIN_CONFIG_DEFAULT } from "@/lib/split";
import { MODELOS_PAGAMENTO, gerarReceber, valorEfetivo, type ModeloPagamento } from "@/lib/pagamento";
import { syncContratoGoogle } from "@/lib/google/client";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";

type ServicoRow = { nome: string; valor: string };
type FreelaRow = { nome: string; valor: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

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
  const [modelo, setModelo] = useState<ModeloPagamento>("sinal_30_parcelado");
  const [desconto, setDesconto] = useState("");
  const [numParcelas, setNumParcelas] = useState("3");
  const [splitModo, setSplitModo] = useState<"padrao" | "igual">("padrao");
  const [anotacoesOp, setAnotacoesOp] = useState("");
  const [saving, setSaving] = useState(false);

  const [servicos, setServicos] = useState<ServicoRow[]>(
    lead.servicos && lead.servicos.length > 0
      ? lead.servicos.map((s) => ({ nome: s.nome, valor: s.valor ? String(s.valor) : "" }))
      : [{ nome: "", valor: "" }]
  );
  const [freelas, setFreelas] = useState<FreelaRow[]>([]);

  // parâmetros do split (impostos/caixa/sócios)
  const [cfg, setCfg] = useState({
    imposto_pct: FIN_CONFIG_DEFAULT.imposto_pct,
    caixa_pct: FIN_CONFIG_DEFAULT.caixa_pct,
    socios: FIN_CONFIG_DEFAULT.socios as SocioConfig[],
  });
  useEffect(() => {
    supabase.from("fin_config").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setCfg({ imposto_pct: Number(data.imposto_pct), caixa_pct: Number(data.caixa_pct), socios: data.socios });
    });
  }, []); // eslint-disable-line

  const valorTotal = useMemo(() => servicos.reduce((s, r) => s + (Number(r.valor) || 0), 0), [servicos]);
  const custoFreelas = useMemo(() => freelas.reduce((s, r) => s + (Number(r.valor) || 0), 0), [freelas]);
  const receitaEfetiva = valorEfetivo(modelo, valorTotal, Number(desconto) || 0);
  const split = calcSplit(receitaEfetiva, custoFreelas, cfg, splitModo);

  const hoje = new Date().toISOString().slice(0, 10);
  const previewReceber = useMemo(
    () => gerarReceber({ modelo, total: valorTotal, desconto: Number(desconto) || 0, numParcelas: Number(numParcelas) || 1, dataEvento: dataEvento || null, hoje }),
    [modelo, valorTotal, desconto, numParcelas, dataEvento, hoje]
  );

  function setServico(i: number, patch: Partial<ServicoRow>) {
    setServicos((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function setFreela(i: number, patch: Partial<FreelaRow>) {
    setFreelas((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!noivo1.trim() || !noivo2.trim()) {
      alert("Informe o nome dos dois noivos.");
      return;
    }
    setSaving(true);

    const modeloLabel = MODELOS_PAGAMENTO.find((m) => m.key === modelo)?.label ?? "";

    // 1. Contrato
    const { data: contrato, error } = await supabase
      .from("contratos")
      .insert({
        lead_id: lead.id,
        noivo1_nome: noivo1.trim(),
        noivo2_nome: noivo2.trim(),
        cpf1: cpf1 || null, cpf2: cpf2 || null,
        profissao: profissao || null, email: email || null,
        telefone: telefone || null, endereco: endereco || null,
        data_evento: dataEvento || null, local: local || null,
        valor_total: valorTotal,
        valor_sinal: modelo === "sinal_30_parcelado" ? round2(valorTotal * 0.3) : 0,
        condicao_pagamento: modeloLabel,
        modelo_pagamento: modelo,
        num_parcelas: modelo === "sinal_30_parcelado" ? Number(numParcelas) || 1 : null,
        desconto: modelo === "a_vista" ? Number(desconto) || 0 : 0,
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
        servicosValidos.map((s) => ({ contrato_id: contrato.id, nome: s.nome.trim(), valor: Number(s.valor) || 0 }))
      );
    }

    // 3. Card de operação
    await supabase.from("operacao_cards").insert({
      contrato_id: contrato.id, coluna_atual: "onboarding",
      checklists: OPERACAO_CHECKLISTS, anotacoes: anotacoesOp || null,
    });

    // 4. Contas a receber (conforme o modelo)
    await supabase.from("fin_receber").insert(
      previewReceber.map((r) => ({ contrato_id: contrato.id, descricao: r.descricao, valor: r.valor, vencimento: r.vencimento, status: r.status }))
    );

    // 5. Contas a pagar: impostos + freelas (50/50)
    const vencSaldo = dataEvento || addDays(hoje, 30);
    const pagar: Record<string, unknown>[] = [
      {
        contrato_id: contrato.id,
        descricao: `Impostos (${cfg.imposto_pct}%)`,
        categoria: "variavel",
        valor: round2(receitaEfetiva * (cfg.imposto_pct / 100)),
        vencimento: vencSaldo,
        status: "a_vencer",
      },
    ];
    for (const f of freelas) {
      const v = Number(f.valor) || 0;
      if (!f.nome.trim() || v <= 0) continue;
      const metade = round2(v / 2);
      pagar.push(
        { contrato_id: contrato.id, descricao: `Freelancer ${f.nome.trim()} — sinal (50%)`, categoria: "freelancer", valor: metade, vencimento: hoje, status: "a_vencer", parcela: "sinal" },
        { contrato_id: contrato.id, descricao: `Freelancer ${f.nome.trim()} — saldo (50%)`, categoria: "freelancer", valor: round2(v - metade), vencimento: vencSaldo, status: "a_vencer", parcela: "saldo" }
      );
    }
    await supabase.from("fin_pagar").insert(pagar);

    // 6. Fecha o lead + Google
    await supabase.from("leads").update({ coluna_atual: "fechamento", arquivado: true }).eq("id", lead.id);
    syncContratoGoogle(contrato.id);

    setSaving(false);
    onDone();
  }

  return (
    <Modal open onClose={onClose} xl title="🤝 Passagem de bastão · Calculadora de evento">
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200">
          Ao confirmar: cria o card na Operação, marca a data como fechada e gera as contas a
          receber (pelo modelo) e a pagar (impostos + freelas).
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
            <Button type="button" size="sm" variant="subtle" onClick={() => setServicos((r) => [...r, { nome: "", valor: "" }])}>+ Item</Button>
          </div>
          <div className="flex flex-col gap-2">
            {servicos.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={s.nome} onChange={(e) => setServico(i, { nome: e.target.value })} placeholder="Ex: Cobertura fotográfica" className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
                  <span className="text-xs text-neutral-400">R$</span>
                  <input type="number" step="0.01" value={s.valor} onChange={(e) => setServico(i, { valor: e.target.value })} placeholder="0,00" className="w-28 px-2 py-2 text-sm outline-none" />
                </div>
                <button type="button" onClick={() => setServicos((r) => r.filter((_, idx) => idx !== i))} className="text-neutral-300 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        </section>

        {/* Modelo de pagamento */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Modelo de pagamento</h3>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value as ModeloPagamento)}>
              {MODELOS_PAGAMENTO.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </Select>
            {modelo === "sinal_30_parcelado" && (
              <Input label="Nº parcelas do saldo" type="number" min={1} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
            )}
            {modelo === "a_vista" && (
              <Input label="Desconto (R$)" type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            )}
            <Select label="Split de lucro" value={splitModo} onChange={(e) => setSplitModo(e.target.value as "padrao" | "igual")}>
              <option value="padrao">Percentuais dos sócios</option>
              <option value="igual">Partes iguais</option>
            </Select>
          </div>
          {/* Preview das parcelas a receber */}
          <div className="mt-2 rounded-lg border border-neutral-200 p-2 text-xs">
            <div className="mb-1 font-medium text-neutral-500">Contas a receber que serão geradas:</div>
            <div className="flex flex-col gap-0.5">
              {previewReceber.map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-neutral-600">{r.descricao} {r.status === "pago" && <span className="text-green-600">· pago</span>}</span>
                  <span className="font-medium text-neutral-700">{brl(r.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Freelas */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-700">Freelancers (custo nominal)</h3>
            <Button type="button" size="sm" variant="subtle" onClick={() => setFreelas((r) => [...r, { nome: "", valor: "" }])}>+ Freela</Button>
          </div>
          <div className="flex flex-col gap-2">
            {freelas.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={f.nome} onChange={(e) => setFreela(i, { nome: e.target.value })} placeholder="Nome (ex: 2º fotógrafo)" className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
                  <span className="text-xs text-neutral-400">R$</span>
                  <input type="number" step="0.01" value={f.valor} onChange={(e) => setFreela(i, { valor: e.target.value })} placeholder="0,00" className="w-28 px-2 py-2 text-sm outline-none" />
                </div>
                <button type="button" onClick={() => setFreelas((r) => r.filter((_, idx) => idx !== i))} className="text-neutral-300 hover:text-red-500">✕</button>
              </div>
            ))}
            {freelas.length === 0 && <p className="text-xs text-neutral-400">Sem freelas. Cada freela gera 2 contas a pagar (50% + 50%).</p>}
          </div>
        </section>

        <Textarea label="Anotações para a operação" rows={2} value={anotacoesOp} onChange={(e) => setAnotacoesOp(e.target.value)} placeholder="Preferências do casal, restrições do local..." />

        {/* Waterfall */}
        <section className="rounded-xl bg-neutral-50 p-3">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <Linha label={modelo === "a_vista" ? "Receita (c/ desconto)" : "Receita"} v={brl(receitaEfetiva)} />
            <Linha label={`− Impostos (${cfg.imposto_pct}%)`} v={brl(split.impostos)} neg />
            <Linha label={`− Caixa (${cfg.caixa_pct}%)`} v={brl(split.caixa)} neg />
            <Linha label="− Freelancers" v={brl(custoFreelas)} neg />
            <Linha label="= Lucro líquido" v={brl(split.lucro)} bold />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {split.distrib.map((d) => (
              <div key={d.nome} className="rounded-lg bg-white p-2 text-sm">
                <div className="text-[11px] text-neutral-400">{d.nome} · {Number(d.pct.toFixed(1))}%</div>
                <div className="font-bold text-neutral-800">{brl(d.valor)}</div>
              </div>
            ))}
          </div>
        </section>

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

function Linha({ label, v, neg, bold }: { label: string; v: string; neg?: boolean; bold?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className={`${bold ? "font-bold text-green-600" : neg ? "font-medium text-red-500" : "font-medium text-neutral-700"}`}>{v}</div>
    </div>
  );
}
