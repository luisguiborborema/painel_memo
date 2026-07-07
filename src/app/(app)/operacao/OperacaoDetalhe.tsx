"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OperacaoEquipe, OperacaoColuna, ContratoServico, OperacaoFollowup, OperacaoAnotacao } from "@/lib/types";
import { OPERACAO_COLUNAS } from "@/lib/constants";
import { brl, formatData, formatDataHora, toISODate } from "@/lib/format";
import { proximoContato, descricaoCadencia } from "@/lib/cadencia";
import { syncContratoGoogle, deleteEventoGoogle } from "@/lib/google/client";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { ReguaMensagens } from "@/components/ReguaMensagens";
import type { OpCardFull } from "./OperacaoCard";

type Tab = "card" | "regua";

export function OperacaoDetalhe({
  card,
  onClose,
  onChange,
}: {
  card: OpCardFull;
  onClose: () => void;
  onChange: () => void;
}) {
  const supabase = createClient();
  const c = card.contrato;
  const [tab, setTab] = useState<Tab>("card");
  const [checklists, setChecklists] = useState(card.checklists ?? {});
  const [equipe, setEquipe] = useState<OperacaoEquipe[]>([]);
  const [servicos, setServicos] = useState<ContratoServico[]>([]);
  const [followups, setFollowups] = useState<OperacaoFollowup[]>([]);
  const [anotacoes, setAnotacoes] = useState<OperacaoAnotacao[]>([]);

  // dados do contrato (editáveis)
  const [dados, setDados] = useState({
    noivo1_nome: c?.noivo1_nome ?? "",
    noivo2_nome: c?.noivo2_nome ?? "",
    data_evento: c?.data_evento ?? "",
    local: c?.local ?? "",
    telefone: c?.telefone ?? "",
    email: c?.email ?? "",
    valor_total: String(c?.valor_total ?? ""),
  });
  const [salvandoDados, setSalvandoDados] = useState(false);

  // forms
  const [pessoa, setPessoa] = useState("");
  const [funcao, setFuncao] = useState("");
  const [valorFree, setValorFree] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [contatoNota, setContatoNota] = useState("");
  const [proxData, setProxData] = useState("");
  const [proxDesc, setProxDesc] = useState("");
  const [novaNota, setNovaNota] = useState("");

  function setDado<K extends keyof typeof dados>(k: K, v: (typeof dados)[K]) {
    setDados((d) => ({ ...d, [k]: v }));
  }

  useEffect(() => {
    supabase.from("operacao_equipe").select("*").eq("operacao_id", card.id).order("created_at").then(({ data }) => setEquipe(data ?? []));
    supabase.from("operacao_followups").select("*").eq("operacao_id", card.id).order("data").then(({ data }) => setFollowups(data ?? []));
    supabase.from("operacao_anotacoes").select("*").eq("operacao_id", card.id).order("created_at", { ascending: false }).then(({ data }) => setAnotacoes(data ?? []));
    if (c) supabase.from("contrato_servicos").select("*").eq("contrato_id", c.id).then(({ data }) => setServicos(data ?? []));
  }, [card.id]); // eslint-disable-line

  async function salvarDados() {
    if (!c) return;
    setSalvandoDados(true);
    await supabase.from("contratos").update({
      noivo1_nome: dados.noivo1_nome.trim() || "—",
      noivo2_nome: dados.noivo2_nome.trim() || "—",
      data_evento: dados.data_evento || null,
      local: dados.local || null,
      telefone: dados.telefone || null,
      email: dados.email || null,
      valor_total: Number(dados.valor_total) || 0,
    }).eq("id", c.id);
    syncContratoGoogle(c.id);
    setSalvandoDados(false);
    onChange();
  }

  // serviços contratados (CRUD)
  async function addServicoRow() {
    if (!c) return;
    const { data } = await supabase.from("contrato_servicos").insert({ contrato_id: c.id, nome: "Novo serviço", valor: 0 }).select("*").single();
    if (data) setServicos((s) => [...s, data]);
  }
  function setServicoLocal(id: string, patch: Partial<ContratoServico>) {
    setServicos((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  async function salvarServico(s: ContratoServico) {
    await supabase.from("contrato_servicos").update({ nome: s.nome, valor: Number(s.valor) || 0 }).eq("id", s.id);
    onChange();
  }
  async function rmServicoRow(id: string) {
    await supabase.from("contrato_servicos").delete().eq("id", id);
    setServicos((s) => s.filter((x) => x.id !== id));
  }

  async function toggleCheck(coluna: string, i: number) {
    const lista = (checklists[coluna] ?? []).map((it, idx) => (idx === i ? { ...it, done: !it.done } : it));
    const next = { ...checklists, [coluna]: lista };
    setChecklists(next);
    await supabase.from("operacao_cards").update({ checklists: next }).eq("id", card.id);
    onChange();
  }

  async function moverColuna(coluna: OperacaoColuna) {
    await supabase.from("operacao_cards").update({ coluna_atual: coluna }).eq("id", card.id);
    onChange();
  }

  async function addPessoa() {
    if (!pessoa.trim()) return;
    const valor = Number(valorFree) || 0;
    const { data } = await supabase.from("operacao_equipe").insert({ operacao_id: card.id, pessoa: pessoa.trim(), funcao: funcao || null, is_freelancer: isFree, valor }).select("*").single();
    if (data) setEquipe((e) => [...e, data]);
    setPessoa(""); setFuncao(""); setValorFree(""); setIsFree(true);
  }
  async function rmPessoa(id: string) {
    await supabase.from("operacao_equipe").delete().eq("id", id);
    setEquipe((e) => e.filter((x) => x.id !== id));
  }

  // Follow-up
  async function registrarContato() {
    const hoje = toISODate(new Date());
    const { data } = await supabase.from("operacao_followups").insert({ operacao_id: card.id, data: hoje, feito: true, observacao: contatoNota.trim() || null }).select("*").single();
    if (data) setFollowups((f) => [...f, data]);
    setContatoNota("");
  }
  async function agendarProximo() {
    if (!proxData) return;
    const { data } = await supabase.from("operacao_followups").insert({ operacao_id: card.id, data: proxData, feito: false, observacao: proxDesc.trim() || null, proximo_contato_agendado: proxData }).select("*").single();
    if (data) setFollowups((f) => [...f, data]);
    setProxData(""); setProxDesc("");
  }
  async function addNota() {
    if (!novaNota.trim()) return;
    const { data } = await supabase.from("operacao_anotacoes").insert({ operacao_id: card.id, texto: novaNota.trim() }).select("*").single();
    if (data) setAnotacoes((a) => [data, ...a]);
    setNovaNota("");
  }

  async function excluir() {
    const nome = c ? `${c.noivo1_nome} & ${c.noivo2_nome}` : "este card";
    if (!confirm(`Excluir "${nome}"?\n\nRemove o card, o contrato e os lançamentos a receber vinculados. Esta ação não pode ser desfeita.`)) return;
    if (c?.google_event_id) await deleteEventoGoogle(c.google_event_id);
    if (c) await supabase.from("contratos").delete().eq("id", c.id);
    else await supabase.from("operacao_cards").delete().eq("id", card.id);
    onChange();
    onClose();
  }

  const feitos = followups.filter((f) => f.feito).length;
  const ultimo = followups.filter((f) => f.feito).map((f) => f.data).sort().at(-1);
  const proximoSugerido = proximoContato(feitos, ultimo);
  const agendado = followups.filter((f) => !f.feito && f.proximo_contato_agendado).map((f) => f.proximo_contato_agendado!).sort().at(0);

  const titulo = c ? `${c.noivo1_nome} & ${c.noivo2_nome}` : "Operação";
  const temPrewedding = servicos.some((s) => /pr[ée]|civil/i.test(s.nome));

  const TabBtn = ({ id, children }: { id: Tab; children: React.ReactNode }) => (
    <button onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}>{children}</button>
  );

  return (
    <Modal open onClose={onClose} xl title={titulo}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1">
          <TabBtn id="card">Card</TabBtn>
          <TabBtn id="regua">Régua</TabBtn>
        </div>
        <Select value={card.coluna_atual} onChange={(e) => moverColuna(e.target.value as OperacaoColuna)}>
          {OPERACAO_COLUNAS.filter((col) => col.key !== "reuniao_prewedding" || temPrewedding).map((col) => (
            <option key={col.key} value={col.key}>{col.label}</option>
          ))}
        </Select>
      </div>

      {tab === "card" && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* ESQUERDA — Produção */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-600">Dados do casal & evento</span>
                  <Button size="sm" onClick={salvarDados} disabled={salvandoDados || !c}>{salvandoDados ? "Salvando..." : "Salvar dados"}</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Noivo(a) 1" value={dados.noivo1_nome} onChange={(e) => setDado("noivo1_nome", e.target.value)} />
                  <Input label="Noivo(a) 2" value={dados.noivo2_nome} onChange={(e) => setDado("noivo2_nome", e.target.value)} />
                  <Input label="Data do evento" type="date" value={dados.data_evento} onChange={(e) => setDado("data_evento", e.target.value)} />
                  <Input label="Local" value={dados.local} onChange={(e) => setDado("local", e.target.value)} />
                  <Input label="Telefone" value={dados.telefone} onChange={(e) => setDado("telefone", e.target.value)} />
                  <Input label="E-mail" value={dados.email} onChange={(e) => setDado("email", e.target.value)} />
                  <Input label="Valor total (R$)" type="number" step="0.01" value={dados.valor_total} onChange={(e) => setDado("valor_total", e.target.value)} />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-600">Serviços contratados</span>
                  <Button size="sm" variant="subtle" onClick={addServicoRow} disabled={!c}>+ Serviço</Button>
                </div>
                <div className="flex flex-col gap-2">
                  {servicos.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <input value={s.nome} onChange={(e) => setServicoLocal(s.id, { nome: e.target.value })} onBlur={() => salvarServico(s)} className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                      <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
                        <span className="text-xs text-neutral-400">R$</span>
                        <input type="number" step="0.01" value={s.valor} onChange={(e) => setServicoLocal(s.id, { valor: Number(e.target.value) })} onBlur={() => salvarServico(s)} className="w-24 px-2 py-2 text-sm outline-none" />
                      </div>
                      <button onClick={() => rmServicoRow(s.id)} className="text-neutral-300 hover:text-red-500">✕</button>
                    </div>
                  ))}
                  {servicos.length === 0 && <p className="text-xs text-neutral-400">Nenhum serviço. Use “+ Serviço”.</p>}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Checklists por etapa</span>
                <div className="flex flex-col gap-2">
                  {OPERACAO_COLUNAS.filter((col) => col.key !== "reuniao_prewedding" || temPrewedding).map((col) => {
                    const lista = checklists[col.key] ?? [];
                    if (!lista.length) return null;
                    const ativa = col.key === card.coluna_atual;
                    return (
                      <div key={col.key} className={`rounded-lg border p-2.5 ${ativa ? "border-neutral-900" : "border-neutral-200"}`}>
                        <div className="mb-1 text-xs font-semibold text-neutral-500">{col.label}</div>
                        {lista.map((it, i) => (
                          <label key={i} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
                            <input type="checkbox" checked={it.done} onChange={() => toggleCheck(col.key, i)} className="h-4 w-4" />
                            <span className={it.done ? "text-neutral-400 line-through" : "text-neutral-700"}>{it.label}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Escala da equipe do evento</span>
                <div className="flex flex-col gap-1.5">
                  {equipe.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <span className="font-medium text-neutral-700">{p.pessoa}</span>
                      {p.funcao && <span className="text-neutral-400">· {p.funcao}</span>}
                      {p.is_freelancer && <span className="rounded-full bg-orange-100 px-1.5 text-[11px] text-orange-600">freela</span>}
                      {p.valor > 0 && <span className="text-xs text-neutral-500">{brl(p.valor)}</span>}
                      <button onClick={() => rmPessoa(p.id)} className="ml-auto text-neutral-300 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
                  <Input label="Pessoa" value={pessoa} onChange={(e) => setPessoa(e.target.value)} placeholder="Nome" />
                  <Input label="Função" value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="foto principal, drone..." />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-neutral-600">Valor</span>
                    <input type="number" step="0.01" value={valorFree} onChange={(e) => setValorFree(e.target.value)} placeholder="R$" className="w-24 rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-900" />
                  </div>
                  <Button type="button" onClick={addPessoa}>+ Add</Button>
                </div>
                <label className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
                  <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
                  É freelancer (pagamentos gerados na Calculadora)
                </label>
              </div>
            </div>

            {/* DIREITA — Follow-up + Anotações */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Follow-up</h3>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-600">{descricaoCadencia(feitos)}</span>
                  <span className="text-xs text-neutral-400">{feitos} feito(s)</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">Sugestão de próximo:</span>
                  <span className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 font-semibold text-neutral-800">{formatData(proximoSugerido)}</span>
                </div>
                {agendado && (
                  <div className="mt-1.5 text-[11px] text-indigo-600">Próximo agendado: {formatData(agendado)}</div>
                )}
              </div>

              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Registrar contato feito (hoje)</span>
                <Textarea rows={2} value={contatoNota} onChange={(e) => setContatoNota(e.target.value)} placeholder="O que foi conversado..." />
                <div className="mt-2 flex justify-end"><Button type="button" size="sm" onClick={registrarContato}>+ Registrar</Button></div>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Agendar próximo contato</span>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={proxData} onChange={(e) => setProxData(e.target.value)} />
                  <Input value={proxDesc} onChange={(e) => setProxDesc(e.target.value)} placeholder="Descrição (opcional)" />
                </div>
                <div className="mt-2 flex justify-end"><Button type="button" size="sm" onClick={agendarProximo} disabled={!proxData}>Agendar</Button></div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Histórico</span>
                <div className="flex flex-col gap-1.5">
                  {followups.map((f) => (
                    <div key={f.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={f.feito ? "text-green-600" : "text-indigo-500"}>{f.feito ? "✓" : "🗓️"}</span>
                        <span className="text-neutral-700">{formatData(f.data)}</span>
                        {!f.feito && <span className="text-[11px] text-indigo-500">agendado</span>}
                      </div>
                      {f.observacao && <div className="mt-0.5 text-xs text-neutral-500">{f.observacao}</div>}
                    </div>
                  ))}
                  {followups.length === 0 && <p className="text-xs text-neutral-400">Nenhum contato registrado ainda.</p>}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Anotações</span>
                <div className="flex gap-2">
                  <input value={novaNota} onChange={(e) => setNovaNota(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNota()} placeholder="Nova anotação..." className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                  <Button type="button" onClick={addNota}>Add</Button>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {c?.anotacoes_operacao && (
                    <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700"><strong>Do comercial:</strong> {c.anotacoes_operacao}</p>
                  )}
                  {anotacoes.map((a) => (
                    <div key={a.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <div className="text-neutral-700">{a.texto}</div>
                      <div className="mt-0.5 text-[11px] text-neutral-400">{formatDataHora(a.created_at)}</div>
                    </div>
                  ))}
                  {anotacoes.length === 0 && !c?.anotacoes_operacao && <p className="text-xs text-neutral-400">Sem anotações.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
            <span className="text-xs text-neutral-400">Excluir remove o card, o contrato e os lançamentos a receber vinculados.</span>
            <Button type="button" variant="ghost" onClick={excluir} className="text-red-600 hover:bg-red-50">Excluir card</Button>
          </div>
        </>
      )}

      {tab === "regua" && (
        <ReguaMensagens
          vars={{
            nome_casal: titulo,
            data: formatData(c?.data_evento),
            local: c?.local,
          }}
        />
      )}
    </Modal>
  );
}
