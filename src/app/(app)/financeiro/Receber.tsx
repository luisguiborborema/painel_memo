"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinReceber, Contrato, ReceberStatus } from "@/lib/types";
import { brl, formatData, parseDate, toISODate } from "@/lib/format";
import { Button, Input, Modal, Select } from "@/components/ui";

type Row = FinReceber & { contrato: Pick<Contrato, "noivo1_nome" | "noivo2_nome"> | null };
type ContratoMini = { id: string; noivo1_nome: string; noivo2_nome: string };

function statusReal(r: FinReceber): ReceberStatus {
  if (r.status === "pago") return "pago";
  const venc = parseDate(r.vencimento);
  if (venc && venc < new Date(new Date().toDateString())) return "atrasado";
  return "a_vencer";
}

const STATUS_UI: Record<ReceberStatus, string> = {
  pago: "bg-green-100 text-green-700",
  a_vencer: "bg-neutral-100 text-neutral-500",
  atrasado: "bg-red-100 text-red-700",
};

export function Receber() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [contratos, setContratos] = useState<ContratoMini[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [fStatus, setFStatus] = useState<"todos" | ReceberStatus>("todos");
  const [fBusca, setFBusca] = useState("");
  const [fMes, setFMes] = useState("");

  // modal nova receita
  const [modal, setModal] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [contratoId, setContratoId] = useState("");

  async function carregar() {
    const [{ data }, { data: cs }] = await Promise.all([
      supabase.from("fin_receber").select("*, contrato:contratos(noivo1_nome, noivo2_nome)").order("vencimento"),
      supabase.from("contratos").select("id, noivo1_nome, noivo2_nome").order("created_at", { ascending: false }),
    ]);
    setRows((data as Row[]) ?? []);
    setContratos((cs as ContratoMini[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  async function togglePago(r: Row) {
    const novo = r.status === "pago" ? "a_vencer" : "pago";
    await supabase.from("fin_receber").update({ status: novo, pago_em: novo === "pago" ? toISODate(new Date()) : null }).eq("id", r.id);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    await supabase.from("fin_receber").delete().eq("id", id);
    carregar();
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) return;
    await supabase.from("fin_receber").insert({
      descricao: descricao.trim(), valor: Number(valor) || 0, vencimento: vencimento || null,
      contrato_id: contratoId || null, status: "a_vencer",
    });
    setDescricao(""); setValor(""); setVencimento(""); setContratoId(""); setModal(false);
    carregar();
  }

  const filtrados = useMemo(() => {
    return rows.filter((r) => {
      if (fStatus !== "todos" && statusReal(r) !== fStatus) return false;
      if (fMes && !(r.vencimento ?? "").startsWith(fMes)) return false;
      if (fBusca) {
        const casal = r.contrato ? `${r.contrato.noivo1_nome} ${r.contrato.noivo2_nome}` : "";
        const alvo = `${casal} ${r.descricao}`.toLowerCase();
        if (!alvo.includes(fBusca.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, fStatus, fMes, fBusca]);

  const totais = useMemo(() => {
    let recebido = 0, aReceber = 0;
    for (const r of filtrados) {
      if (r.status === "pago") recebido += Number(r.valor);
      else aReceber += Number(r.valor);
    }
    return { recebido, aReceber, total: recebido + aReceber };
  }, [filtrados]);

  if (loading) return <p className="text-sm text-neutral-400">Carregando...</p>;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card label="Recebido" v={brl(totais.recebido)} cor="text-green-600" />
        <Card label="A receber" v={brl(totais.aReceber)} cor="text-amber-600" />
        <Card label="Total (filtrado)" v={brl(totais.total)} />
      </div>

      {/* Filtros + ação */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={fBusca} onChange={(e) => setFBusca(e.target.value)} placeholder="Buscar casal/descrição..." className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900" />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900">
          <option value="todos">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="a_vencer">A vencer</option>
          <option value="atrasado">Atrasado</option>
        </select>
        <input type="month" value={fMes} onChange={(e) => setFMes(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900" />
        {(fBusca || fStatus !== "todos" || fMes) && (
          <button onClick={() => { setFBusca(""); setFStatus("todos"); setFMes(""); }} className="text-xs text-neutral-400 hover:text-neutral-600">limpar</button>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setModal(true)}>+ Nova receita</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Evento / Casal</th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Vencimento</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtrados.map((r) => {
              const st = statusReal(r);
              return (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 font-medium text-neutral-700">
                    {r.contrato ? `${r.contrato.noivo1_nome} & ${r.contrato.noivo2_nome}` : <span className="text-neutral-300">avulso</span>}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{r.descricao}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatData(r.vencimento)}</td>
                  <td className="px-4 py-2 text-right font-medium">{brl(r.valor)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_UI[st]}`}>
                      {st === "a_vencer" ? "A vencer" : st === "pago" ? "Pago" : "Atrasado"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant={r.status === "pago" ? "outline" : "primary"} onClick={() => togglePago(r)}>
                        {r.status === "pago" ? "Desfazer" : "Marcar pago"}
                      </Button>
                      <button onClick={() => excluir(r.id)} className="px-1 text-neutral-300 hover:text-red-500">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">Nenhum lançamento.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nova receita">
        <form onSubmit={adicionar} className="flex flex-col gap-3">
          <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} autoFocus required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            <Input label="Vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
          <Select label="Vincular ao evento (opcional)" value={contratoId} onChange={(e) => setContratoId(e.target.value)}>
            <option value="">— avulso —</option>
            {contratos.map((c) => <option key={c.id} value={c.id}>{c.noivo1_nome} & {c.noivo2_nome}</option>)}
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Card({ label, v, cor = "text-neutral-800" }: { label: string; v: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${cor}`}>{v}</div>
    </div>
  );
}
