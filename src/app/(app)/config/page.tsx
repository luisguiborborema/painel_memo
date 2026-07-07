"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MsgTemplate } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Button, Spinner } from "@/components/ui";
import { ServicosConfig } from "./ServicosConfig";

type Aba = "regua" | "servicos";

export default function ConfigPage() {
  const supabase = createClient();
  const [aba, setAba] = useState<Aba>("regua");
  const [templates, setTemplates] = useState<MsgTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvo, setSalvo] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("msg_templates").select("*").order("ordem").then(({ data }) => {
      setTemplates(data ?? []);
      setLoading(false);
    });
  }, []); // eslint-disable-line

  function editar(id: string, patch: Partial<MsgTemplate>) {
    setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function salvar(t: MsgTemplate) {
    await supabase.from("msg_templates").update({ titulo: t.titulo, corpo: t.corpo }).eq("id", t.id);
    setSalvo(t.id);
    setTimeout(() => setSalvo((s) => (s === t.id ? null : s)), 1500);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Régua & Configuração"
        subtitle="Mensagens-modelo (copiar e colar). Variáveis: {nome_casal}, {data}, {link_proposta}, {local}"
        tabs={
          <>
            <button onClick={() => setAba("regua")} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${aba === "regua" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}>Régua</button>
            <button onClick={() => setAba("servicos")} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${aba === "servicos" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}>Serviços</button>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {aba === "servicos" ? (
          <ServicosConfig />
        ) : loading ? (
          <Spinner />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <input
                  value={t.titulo}
                  onChange={(e) => editar(t.id, { titulo: e.target.value })}
                  className="mb-2 w-full rounded-lg border border-transparent px-1 py-1 text-sm font-semibold text-neutral-800 outline-none hover:border-neutral-200 focus:border-neutral-900"
                />
                <textarea
                  value={t.corpo}
                  onChange={(e) => editar(t.id, { corpo: e.target.value })}
                  rows={4}
                  className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  {salvo === t.id && <span className="text-xs text-green-600">✓ Salvo</span>}
                  <Button size="sm" onClick={() => salvar(t)}>Salvar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
