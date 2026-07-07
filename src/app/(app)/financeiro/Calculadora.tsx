"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Contrato, SocioConfig } from "@/lib/types";
import { calcSplit, FIN_CONFIG_DEFAULT } from "@/lib/split";
import { brl, formatData } from "@/lib/format";
import { Button, Input } from "@/components/ui";

type PagarMini = { contrato_id: string | null; categoria: string; valor: number };
type ReceberMini = { contrato_id: string | null; valor: number; status: string };

export function Calculadora() {
  const supabase = createClient();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [freePorContrato, setFreePorContrato] = useState<Record<string, number>>({});
  const [parcelasPorContrato, setParcelasPorContrato] = useState<Record<string, { n: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  // parâmetros editáveis (com fallback nos defaults)
  const [imposto, setImposto] = useState(String(FIN_CONFIG_DEFAULT.imposto_pct));
  const [caixa, setCaixa] = useState(String(FIN_CONFIG_DEFAULT.caixa_pct));
  const [socios, setSocios] = useState<SocioConfig[]>(FIN_CONFIG_DEFAULT.socios);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: pag }, { data: rec }, { data: cfg }] = await Promise.all([
        supabase.from("contratos").select("*").order("created_at", { ascending: false }),
        supabase.from("fin_pagar").select("contrato_id, categoria, valor"),
        supabase.from("fin_receber").select("contrato_id, valor, status"),
        supabase.from("fin_config").select("*").eq("id", 1).maybeSingle(),
      ]);
      // custo de freelas por contrato (vindo das contas a pagar geradas na calculadora)
      const map: Record<string, number> = {};
      for (const p of (pag as PagarMini[]) ?? []) {
        if (p.contrato_id && p.categoria === "freelancer")
          map[p.contrato_id] = (map[p.contrato_id] ?? 0) + Number(p.valor);
      }
      // parcelas a receber por contrato
      const parc: Record<string, { n: number; total: number }> = {};
      for (const r of (rec as ReceberMini[]) ?? []) {
        if (!r.contrato_id) continue;
        const cur = parc[r.contrato_id] ?? { n: 0, total: 0 };
        cur.n += 1; cur.total += Number(r.valor);
        parc[r.contrato_id] = cur;
      }
      setContratos((cs as Contrato[]) ?? []);
      setFreePorContrato(map);
      setParcelasPorContrato(parc);
      if (cfg) {
        setImposto(String(cfg.imposto_pct));
        setCaixa(String(cfg.caixa_pct));
        if (Array.isArray(cfg.socios) && cfg.socios.length) setSocios(cfg.socios);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  const cfg = useMemo(
    () => ({ imposto_pct: Number(imposto) || 0, caixa_pct: Number(caixa) || 0, socios }),
    [imposto, caixa, socios]
  );
  const totalSociosPct = socios.reduce((s, x) => s + (Number(x.pct) || 0), 0);

  function setSocio(i: number, patch: Partial<SocioConfig>) {
    setSocios((ss) => ss.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSocio() {
    setSocios((ss) => [...ss, { nome: "Novo sócio", pct: 0 }]);
  }
  function rmSocio(i: number) {
    setSocios((ss) => ss.filter((_, idx) => idx !== i));
  }

  async function salvarConfig() {
    setSalvando(true);
    await supabase.from("fin_config").upsert({
      id: 1,
      imposto_pct: Number(imposto) || 0,
      caixa_pct: Number(caixa) || 0,
      socios: socios.map((s) => ({ nome: s.nome, pct: Number(s.pct) || 0 })),
    });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 1500);
  }

  if (loading) return <p className="text-sm text-neutral-400">Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      {/* Parâmetros editáveis */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-700">Parâmetros de cálculo</span>
          <div className="flex items-center gap-2">
            {salvo && <span className="text-xs text-green-600">✓ Salvo como padrão</span>}
            <Button size="sm" onClick={salvarConfig} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar como padrão"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-600">Imposto (%)</span>
            <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
              <input type="number" step="0.1" value={imposto} onChange={(e) => setImposto(e.target.value)} className="w-full px-1 py-2 text-sm outline-none" />
              <span className="text-xs text-neutral-400">%</span>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-600">Caixa da empresa (%)</span>
            <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
              <input type="number" step="0.1" value={caixa} onChange={(e) => setCaixa(e.target.value)} className="w-full px-1 py-2 text-sm outline-none" />
              <span className="text-xs text-neutral-400">%</span>
            </div>
          </label>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">Distribuição entre sócios</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${Math.abs(totalSociosPct - 100) < 0.01 ? "text-green-600" : "text-amber-600"}`}>
                Soma: {totalSociosPct.toFixed(1).replace(".0", "")}%
              </span>
              <Button size="sm" variant="subtle" onClick={addSocio}>+ Sócio</Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {socios.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={s.nome}
                  onChange={(e) => setSocio(i, { nome: e.target.value })}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
                <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
                  <input type="number" step="0.1" value={s.pct} onChange={(e) => setSocio(i, { pct: Number(e.target.value) })} className="w-20 px-1 py-2 text-sm outline-none" />
                  <span className="text-xs text-neutral-400">%</span>
                </div>
                <button onClick={() => rmSocio(i)} className="text-neutral-300 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
          {Math.abs(totalSociosPct - 100) >= 0.01 && (
            <p className="mt-1.5 text-[11px] text-amber-600">
              A soma dos sócios não fecha 100% — no modo “padrão” o lucro será distribuído exatamente por esses percentuais.
            </p>
          )}
        </div>
      </div>

      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">
        Calculadora por evento: receita − imposto − caixa − custo de freelancers = lucro líquido,
        dividido entre os sócios. Freelas e parcelas vêm dos lançamentos gerados na passagem de
        bastão. Ajuste os parâmetros acima para recalcular todos os eventos ao vivo.
      </p>

      {contratos.map((c) => {
        const custoFree = freePorContrato[c.id] ?? 0;
        const { impostos, caixa: caixaV, lucro, distrib } = calcSplit(Number(c.valor_total), custoFree, cfg, c.split_modo);
        return (
          <div key={c.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-neutral-800">{c.noivo1_nome} & {c.noivo2_nome}</div>
                <div className="text-xs text-neutral-400">{formatData(c.data_evento)} · {c.split_modo === "padrao" ? "percentuais" : "partes iguais"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-400">Lucro líquido</div>
                <div className="text-lg font-bold text-green-600">{brl(lucro)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 pb-3 text-sm sm:grid-cols-4">
              <Linha label="Receita" v={brl(c.valor_total)} />
              <Linha label={`− Impostos (${cfg.imposto_pct}%)`} v={brl(impostos)} neg />
              <Linha label={`− Caixa (${cfg.caixa_pct}%)`} v={brl(caixaV)} neg />
              <Linha label="− Freelancers" v={brl(custoFree)} neg />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {distrib.map((d) => (
                <div key={d.nome} className="rounded-lg bg-neutral-50 p-3">
                  <div className="text-xs text-neutral-400">{d.nome} · {Number(d.pct.toFixed(1))}%</div>
                  <div className="text-base font-bold text-neutral-800">{brl(d.valor)}</div>
                </div>
              ))}
            </div>

            {parcelasPorContrato[c.id] && (
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium">
                  {parcelasPorContrato[c.id].n} parcela(s) a receber
                </span>
                <span>total {brl(parcelasPorContrato[c.id].total)}</span>
              </div>
            )}
          </div>
        );
      })}
      {contratos.length === 0 && <p className="text-sm text-neutral-400">Nenhum contrato fechado ainda.</p>}
    </div>
  );
}

function Linha({ label, v, neg }: { label: string; v: string; neg?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className={`font-medium ${neg ? "text-red-500" : "text-neutral-700"}`}>{v}</div>
    </div>
  );
}
