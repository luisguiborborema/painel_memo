"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ServicoConfig } from "@/lib/types";
import { Button, Input, Spinner } from "@/components/ui";

const CORES: { label: string; cls: string }[] = [
  { label: "Azul", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { label: "Roxo", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  { label: "Rosa", cls: "bg-pink-100 text-pink-700 border-pink-200" },
  { label: "Âmbar", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { label: "Verde-água", cls: "bg-teal-100 text-teal-700 border-teal-200" },
  { label: "Esmeralda", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { label: "Céu", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  { label: "Neutro", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
];

export function ServicosConfig() {
  const supabase = createClient();
  const [servicos, setServicos] = useState<ServicoConfig[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const { data } = await supabase.from("servicos_config").select("*").order("ordem");
    setServicos((data as ServicoConfig[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  function editarLocal(id: string, patch: Partial<ServicoConfig>) {
    setServicos((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function salvar(s: ServicoConfig) {
    await supabase.from("servicos_config").update({ nome: s.nome, cor: s.cor, ativo: s.ativo, ordem: s.ordem }).eq("id", s.id);
    carregar();
  }

  async function adicionar() {
    const ordem = (servicos.at(-1)?.ordem ?? 0) + 1;
    await supabase.from("servicos_config").insert({ nome: "Novo serviço", cor: CORES[7].cls, ordem });
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este serviço da lista?")) return;
    await supabase.from("servicos_config").delete().eq("id", id);
    setServicos((ss) => ss.filter((s) => s.id !== id));
  }

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">Serviços disponíveis para os cards e o forecast.</p>
        <Button size="sm" onClick={adicionar}>+ Serviço</Button>
      </div>
      {servicos.map((s) => (
        <div key={s.id} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cor}`}>{s.nome || "—"}</span>
          <Input value={s.nome} onChange={(e) => editarLocal(s.id, { nome: e.target.value })} className="flex-1" />
          <select
            value={s.cor}
            onChange={(e) => editarLocal(s.id, { cor: e.target.value })}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-xs outline-none focus:border-neutral-900"
          >
            {CORES.map((c) => (
              <option key={c.cls} value={c.cls}>{c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-neutral-500">
            <input type="checkbox" checked={s.ativo} onChange={(e) => editarLocal(s.id, { ativo: e.target.checked })} />
            ativo
          </label>
          <Button size="sm" variant="subtle" onClick={() => salvar(s)}>Salvar</Button>
          <button onClick={() => excluir(s.id)} className="px-1 text-neutral-300 hover:text-red-500">✕</button>
        </div>
      ))}
      {servicos.length === 0 && (
        <p className="text-sm text-neutral-400">
          Nenhum serviço. Rode a migration 0004 (cria a lista padrão) ou clique em “+ Serviço”.
        </p>
      )}
    </div>
  );
}
