"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FinPagar, PagarCategoria, FinReceber, PagarStatus } from "@/lib/types";
import { FIN_CONFIG_DEFAULT } from "@/lib/split";
import { brl, formatData, parseDate, toISODate } from "@/lib/format";
import { Button, Input, Modal, Select } from "@/components/ui";

type Row = FinPagar & { contrato: { noivo1_nome: string; noivo2_nome: string } | null };

const CAT_UI: Record<PagarCategoria, string> = {
  fixa: "bg-blue-100 text-blue-700",
  variavel: "bg-purple-100 text-purple-700",
  freelancer: "bg-orange-100 text-orange-700",
};
const CAT_LABEL: Record<PagarCategoria, string> = {
  fixa: "Fixa", variavel: "Variável", freelancer: "Freelancer",
};

function statusReal(r: FinPagar): PagarStatus {
  if (r.status === "pago") return "pago";
  const venc = parseDate(r.vencimento);
  if (venc && venc < new Date(new Date().toDateString())) return "atrasado";
  return "a_vencer";
}

export function Pagar() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [receber, setReceber] = useState<FinReceber[]>([]);
  const [impostoPct, setImpostoPct] = useState(FIN_CONFIG_DEFAULT.imposto_pct);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  // filtros
  const [fCat, setFCat] = useState<"todas" | PagarCategoria>("todas");
  const [fStatus, setFStatus] = useState<"todos" | PagarStatus>("todos");
  const [fMes, setFMes] = useState("");
  const [fBusca, setFBusca] = useState("");

  // form
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<PagarCategoria>("variavel");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");

  async function carregar() {
    const [{ data: p }, { data: r }, { data: cfg }] = await Promise.all([
      supabase.from("fin_pagar").select("*, contrato:contratos(noivo1_nome, noivo2_nome)").order("vencimento"),
      supabase.from("fin_receber").select("*"),
      supabase.from("fin_config").select("imposto_pct").eq("id", 1).maybeSingle(),
    ]);
    setRows((p as Row[]) ?? []);
    setReceber((r as FinReceber[]) ?? []);
    if (cfg?.imposto_pct != null) setImpostoPct(Number(cfg.imposto_pct));
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  const filtrados = useMemo(() => {
    return rows.filter((r) => {
      if (fCat !== "todas" && r.categoria !== fCat) return false;
      if (fStatus !== "todos" && statusReal(r) !== fStatus) return false;
      if (fMes && !(r.vencimento ?? "").startsWith(fMes)) return false;
      if (fBusca) {
        const casal = r.contrato ? `${r.contrato.noivo1_nome} ${r.contrato.noivo2_nome}` : "";
        if (!`${r.descricao} ${casal}`.toLowerCase().includes(fBusca.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, fCat, fStatus, fMes, fBusca]);

  async function togglePago(r: FinPagar) {
    const novo = r.status === "pago" ? "a_vencer" : "pago";
    await supabase.from("fin_pagar").update({
      status: novo, pago_em: novo === "pago" ? toISODate(new Date()) : null,
    }).eq("id", r.id);
    carregar();
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) return;
    await supabase.from("fin_pagar").insert({
      descricao: descricao.trim(), categoria, valor: Number(valor) || 0, vencimento: vencimento || null,
    });
    setDescricao(""); setValor(""); setVencimento(""); setCategoria("variavel");
    setModal(false);
    carregar();
  }

  async function excluir(id: string) {
    await supabase.from("fin_pagar").delete().eq("id", id);
    carregar();
  }

  // Imposto: 12% sobre o faturamento (recebido) do mês corrente
  const impostoMes = useMemo(() => {
    const agora = new Date();
    const ym = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    const faturamento = receber
      .filter((r) => r.status === "pago" && (r.pago_em ?? r.vencimento)?.startsWith(ym))
      .reduce((s, r) => s + Number(r.valor), 0);
    return { faturamento, imposto: faturamento * (impostoPct / 100), ym };
  }, [receber, impostoPct]);

  const totalPagar = filtrados.filter((r) => r.status !== "pago").reduce((s, r) => s + Number(r.valor), 0);
  const totalPago = filtrados.filter((r) => r.status === "pago").reduce((s, r) => s + Number(r.valor), 0);

  if (loading) return <p className="text-sm text-neutral-400">Carregando...</p>;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-400">A pagar (aberto)</div>
          <div className="mt-1 text-xl font-bold text-amber-600">{brl(totalPagar)}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-400">Pago</div>
          <div className="mt-1 text-xl font-bold text-neutral-800">{brl(totalPago)}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs text-amber-600">Imposto do mês ({Number(impostoPct.toFixed(2))}% do faturamento)</div>
          <div className="mt-1 text-xl font-bold text-amber-700">{brl(impostoMes.imposto)}</div>
          <div className="text-[11px] text-amber-500">Faturamento pago em {impostoMes.ym}: {brl(impostoMes.faturamento)}</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={fBusca} onChange={(e) => setFBusca(e.target.value)} placeholder="Buscar descrição/evento..." className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900" />
        <select value={fCat} onChange={(e) => setFCat(e.target.value as typeof fCat)} className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900">
          <option value="todas">Todas categorias</option>
          <option value="fixa">Fixa</option>
          <option value="variavel">Variável</option>
          <option value="freelancer">Freelancer</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-900">
          <option value="todos">Todos status</option>
          <option value="pago">Pago</option>
          <option value="a_vencer">A vencer</option>
          <option value="atrasado">Atrasado</option>
        </select>
        <input type="month" value={fMes} onChange={(e) => setFMes(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900" />
        {(fBusca || fCat !== "todas" || fStatus !== "todos" || fMes) && (
          <button onClick={() => { setFBusca(""); setFCat("todas"); setFStatus("todos"); setFMes(""); }} className="text-xs text-neutral-400 hover:text-neutral-600">limpar</button>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setModal(true)}>+ Nova despesa</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Evento</th>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Vencimento</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtrados.map((r) => {
              const atrasado = statusReal(r) === "atrasado";
              return (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 font-medium text-neutral-700">{r.descricao}</td>
                  <td className="px-4 py-2 text-neutral-500">{r.contrato ? `${r.contrato.noivo1_nome} & ${r.contrato.noivo2_nome}` : <span className="text-neutral-300">—</span>}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CAT_UI[r.categoria]}`}>{CAT_LABEL[r.categoria]}</span></td>
                  <td className="px-4 py-2 text-neutral-500">{formatData(r.vencimento)}</td>
                  <td className="px-4 py-2 text-right font-medium">{brl(r.valor)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.status === "pago" ? "bg-green-100 text-green-700" : atrasado ? "bg-red-100 text-red-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {r.status === "pago" ? "Pago" : atrasado ? "Atrasado" : "A vencer"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant={r.status === "pago" ? "outline" : "primary"} onClick={() => togglePago(r)}>
                        {r.status === "pago" ? "Desfazer" : "Pago"}
                      </Button>
                      <button onClick={() => excluir(r.id)} className="px-1 text-neutral-300 hover:text-red-500">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">Nenhuma despesa.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nova despesa">
        <form onSubmit={adicionar} className="flex flex-col gap-3">
          <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Contador (mensal)" autoFocus required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as PagarCategoria)}>
              <option value="fixa">Fixa</option>
              <option value="variavel">Variável</option>
              <option value="freelancer">Freelancer</option>
            </Select>
            <Input label="Valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <Input label="Vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
