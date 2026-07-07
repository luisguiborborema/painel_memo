"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadFollowup, LeadAnotacao, AgendaItem, LeadColuna, Porte, ServicoValor } from "@/lib/types";
import { LEAD_COLUNAS } from "@/lib/constants";
import { sugestaoPorte } from "@/lib/porte";
import { avaliarData, DISP_UI } from "@/lib/agenda";
import { formatData, formatDataHora, toISODate } from "@/lib/format";
import { proximoContato, descricaoCadencia } from "@/lib/cadencia";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { ReguaMensagens } from "@/components/ReguaMensagens";
import { ServicosEditor } from "./ServicosEditor";
import { PorteBar } from "./PorteBar";

type Tab = "card" | "regua";

export function LeadDetalhe({
  lead,
  agenda,
  onClose,
  onChange,
  onPassagem,
}: {
  lead: Lead;
  agenda: AgendaItem[];
  onClose: () => void;
  onChange: () => void;
  onPassagem: (lead: Lead) => void;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("card");
  const [form, setForm] = useState(lead);
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [anotacoes, setAnotacoes] = useState<LeadAnotacao[]>([]);
  const [novaNota, setNovaNota] = useState("");
  const [contatoNota, setContatoNota] = useState("");
  const [proxData, setProxData] = useState("");
  const [proxDesc, setProxDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(lead);
    setProxData(lead.proxima_atividade_data ?? "");
    setProxDesc(lead.proxima_atividade_desc ?? "");
  }, [lead]);

  useEffect(() => {
    supabase.from("lead_followups").select("*").eq("lead_id", lead.id).order("data").then(({ data }) => setFollowups(data ?? []));
    supabase.from("lead_anotacoes").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).then(({ data }) => setAnotacoes(data ?? []));
  }, [lead.id]); // eslint-disable-line

  const disp = avaliarData(form.data_casamento, agenda, lead.id);
  const ui = DISP_UI[disp.estado];

  function set<K extends keyof Lead>(k: K, v: Lead[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setConvidados(v: number | null) {
    setForm((f) => {
      const next = { ...f, num_convidados: v };
      if (!f.porte_manual) next.porte = sugestaoPorte(v);
      return next;
    });
  }
  function setPorte(porte: Porte, manual: boolean) {
    setForm((f) => ({ ...f, porte, porte_manual: manual }));
  }
  function setServicos(servicos: ServicoValor[]) {
    set("servicos", servicos);
  }

  async function salvarInfos() {
    setSaving(true);
    await supabase
      .from("leads")
      .update({
        nome_casal: form.nome_casal,
        data_casamento: form.data_casamento || null,
        num_convidados: form.num_convidados,
        local: form.local,
        whatsapp: form.whatsapp,
        origem: form.origem,
        servicos: form.servicos ?? [],
        porte: form.porte,
        porte_manual: form.porte_manual,
        link_proposta: form.link_proposta,
      })
      .eq("id", lead.id);
    setSaving(false);
    onChange();
  }

  async function salvarServicos() {
    await supabase.from("leads").update({ servicos: form.servicos ?? [] }).eq("id", lead.id);
  }
  async function salvarLink() {
    await supabase.from("leads").update({ link_proposta: form.link_proposta || null }).eq("id", lead.id);
  }

  async function toggleChecklist(i: number) {
    const cl = form.checklist.map((c, idx) => (idx === i ? { ...c, done: !c.done } : c));
    set("checklist", cl);
    await supabase.from("leads").update({ checklist: cl }).eq("id", lead.id);
  }

  async function moverColuna(coluna: LeadColuna) {
    set("coluna_atual", coluna);
    await supabase.from("leads").update({ coluna_atual: coluna }).eq("id", lead.id);
    onChange();
  }

  async function addNota() {
    if (!novaNota.trim()) return;
    const { data } = await supabase.from("lead_anotacoes").insert({ lead_id: lead.id, texto: novaNota.trim() }).select("*").single();
    if (data) setAnotacoes((a) => [data, ...a]);
    setNovaNota("");
  }

  // Registra um contato feito (hoje) com anotação própria.
  async function registrarContato() {
    const hoje = toISODate(new Date());
    const { data } = await supabase
      .from("lead_followups")
      .insert({ lead_id: lead.id, data: hoje, feito: true, observacao: contatoNota.trim() || null })
      .select("*")
      .single();
    if (data) setFollowups((f) => [...f, data]);
    setContatoNota("");
  }

  // Agenda o próximo contato: alimenta o board (próxima atividade) e a Agenda.
  async function agendarProximo() {
    if (!proxData) return;
    await supabase
      .from("leads")
      .update({ proxima_atividade_data: proxData, proxima_atividade_desc: proxDesc.trim() || null })
      .eq("id", lead.id);
    setForm((f) => ({ ...f, proxima_atividade_data: proxData, proxima_atividade_desc: proxDesc.trim() || null }));
    onChange();
  }

  async function limparProximo() {
    await supabase.from("leads").update({ proxima_atividade_data: null, proxima_atividade_desc: null }).eq("id", lead.id);
    setProxData(""); setProxDesc("");
    setForm((f) => ({ ...f, proxima_atividade_data: null, proxima_atividade_desc: null }));
    onChange();
  }

  const feitos = followups.filter((f) => f.feito).length;
  const ultimo = followups.filter((f) => f.feito).map((f) => f.data).sort().at(-1);
  const proximoSugerido = proximoContato(feitos, ultimo);

  async function arquivar() {
    if (!confirm("Arquivar este lead?")) return;
    await supabase.from("leads").update({ arquivado: true }).eq("id", lead.id);
    onChange();
    onClose();
  }
  async function excluir() {
    if (!confirm(`Excluir permanentemente o lead "${form.nome_casal}"?\n\nEsta ação não pode ser desfeita.`)) return;
    await supabase.from("leads").delete().eq("id", lead.id);
    onChange();
    onClose();
  }

  const TabBtn = ({ id, children }: { id: Tab; children: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );

  return (
    <Modal open onClose={onClose} xl title={
      <div className="flex items-center gap-3">
        <span>{form.nome_casal}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
          {LEAD_COLUNAS.find((c) => c.key === form.coluna_atual)?.label}
        </span>
      </div>
    }>
      {form.data_casamento && disp.estado !== "vazio" && (
        <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${ui.classe}`}>
          <span className={`h-2 w-2 rounded-full ${ui.dot}`} />
          {ui.label(disp)}
          <span className="ml-auto text-xs opacity-70">{formatData(form.data_casamento)}</span>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1">
          <TabBtn id="card">Card</TabBtn>
          <TabBtn id="regua">Régua</TabBtn>
        </div>
        <Select value={form.coluna_atual} onChange={(e) => moverColuna(e.target.value as LeadColuna)}>
          {LEAD_COLUNAS.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </Select>
      </div>

      {tab === "card" && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* ESQUERDA — Detalhes */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Detalhes</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Data do casamento" type="date" value={form.data_casamento ?? ""} onChange={(e) => set("data_casamento", e.target.value || null)} />
                <Input label="Nº de convidados" type="number" value={form.num_convidados ?? ""} onChange={(e) => setConvidados(e.target.value ? Number(e.target.value) : null)} />
              </div>
              <PorteBar porte={form.porte} convidados={form.num_convidados} onChange={setPorte} />
              <Input label="Local" value={form.local ?? ""} onChange={(e) => set("local", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="WhatsApp" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} />
                <Select label="Origem" value={form.origem ?? "instagram"} onChange={(e) => set("origem", e.target.value as Lead["origem"])}>
                  {["instagram", "indicacao", "google", "outro"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium text-neutral-600">Serviços (com valor)</span>
                <ServicosEditor value={form.servicos ?? []} onChange={setServicos} onBlurSave={salvarServicos} />
              </div>
              <div className="flex items-end gap-2">
                <Input label="Link do cardápio (proposta)" className="flex-1" value={form.link_proposta ?? ""} onChange={(e) => set("link_proposta", e.target.value)} onBlur={salvarLink} placeholder="https://..." />
                {form.link_proposta && (
                  <a href={form.link_proposta} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline">Abrir</Button>
                  </a>
                )}
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Checklist de qualificação</span>
                <div className="flex flex-col gap-1">
                  {form.checklist.map((c, i) => (
                    <label key={i} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-neutral-50">
                      <input type="checkbox" checked={c.done} onChange={() => toggleChecklist(i)} className="h-4 w-4 rounded" />
                      <span className={c.done ? "text-neutral-400 line-through" : "text-neutral-700"}>{c.label}</span>
                    </label>
                  ))}
                </div>
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
              </div>

              {/* Registrar contato feito */}
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Registrar contato feito (hoje)</span>
                <Textarea rows={2} value={contatoNota} onChange={(e) => setContatoNota(e.target.value)} placeholder="O que foi conversado..." />
                <div className="mt-2 flex justify-end">
                  <Button type="button" size="sm" onClick={registrarContato}>+ Registrar</Button>
                </div>
              </div>

              {/* Agendar próximo contato */}
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Agendar próximo contato</span>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={proxData} onChange={(e) => setProxData(e.target.value)} />
                  <Input value={proxDesc} onChange={(e) => setProxDesc(e.target.value)} placeholder="Descrição (opcional)" />
                </div>
                <div className="mt-2 flex justify-between">
                  {form.proxima_atividade_data ? (
                    <button onClick={limparProximo} className="text-xs text-neutral-400 hover:text-red-600">Limpar tarefa</button>
                  ) : <span />}
                  <Button type="button" size="sm" onClick={agendarProximo} disabled={!proxData}>Agendar</Button>
                </div>
                {form.proxima_atividade_data && (
                  <p className="mt-1.5 text-[11px] text-neutral-500">
                    Tarefa atual: <strong>{formatData(form.proxima_atividade_data)}</strong>
                    {form.proxima_atividade_desc ? ` · ${form.proxima_atividade_desc}` : ""}
                  </p>
                )}
              </div>

              {/* Histórico de contatos */}
              <div>
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Histórico</span>
                <div className="flex flex-col gap-1.5">
                  {followups.map((f) => (
                    <div key={f.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-neutral-700">{formatData(f.data)}</span>
                      </div>
                      {f.observacao && <div className="mt-0.5 text-xs text-neutral-500">{f.observacao}</div>}
                    </div>
                  ))}
                  {followups.length === 0 && <p className="text-xs text-neutral-400">Nenhum contato registrado ainda.</p>}
                </div>
              </div>

              {/* Anotações gerais */}
              <div>
                <span className="mb-1.5 block text-sm font-medium text-neutral-600">Anotações</span>
                <div className="flex gap-2">
                  <input value={novaNota} onChange={(e) => setNovaNota(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNota()} placeholder="Nova anotação..." className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                  <Button type="button" onClick={addNota}>Add</Button>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {anotacoes.map((a) => (
                    <div key={a.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <div className="text-neutral-700">{a.texto}</div>
                      <div className="mt-0.5 text-[11px] text-neutral-400">{formatDataHora(a.created_at)}</div>
                    </div>
                  ))}
                  {anotacoes.length === 0 && <p className="text-xs text-neutral-400">Sem anotações.</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé de ações */}
          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
            <div className="flex gap-1">
              <Button type="button" variant="ghost" onClick={arquivar}>Arquivar</Button>
              <Button type="button" variant="ghost" onClick={excluir} className="text-red-600 hover:bg-red-50">Excluir</Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => onPassagem({ ...form })} className="bg-green-600 hover:bg-green-500">🤝 Passagem de bastão</Button>
              <Button type="button" onClick={salvarInfos} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </>
      )}

      {tab === "regua" && (
        <ReguaMensagens
          vars={{
            nome_casal: form.nome_casal,
            data: formatData(form.data_casamento),
            link_proposta: form.link_proposta,
            local: form.local,
          }}
        />
      )}
    </Modal>
  );
}
