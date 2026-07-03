"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgendaItem } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Button, Spinner } from "@/components/ui";
import { formatData, toISODate } from "@/lib/format";
import { EventoModal } from "./EventoModal";
import { NovoEventoModal } from "./NovoEventoModal";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function AgendaPage() {
  const supabase = createClient();
  const [itens, setItens] = useState<AgendaItem[]>([]);
  const [googleItens, setGoogleItens] = useState<AgendaItem[]>([]);
  const [googleOn, setGoogleOn] = useState<boolean | null>(null);
  const [googleErro, setGoogleErro] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"mes" | "lista">("mes");
  const [selecionado, setSelecionado] = useState<AgendaItem | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  // mês/ano de referência (guardado como números para evitar Date.now no server)
  const [ref, setRef] = useState<{ y: number; m: number } | null>(null);

  async function carregarMemo() {
    const { data } = await supabase.from("v_agenda").select("*");
    setItens((data as AgendaItem[]) ?? []);
  }

  async function carregarGoogle() {
    try {
      const res = await fetch("/api/google/events");
      const json = await res.json();
      setGoogleOn(!!json.configured);
      setGoogleErro(json.error ?? null);
      setGoogleItens(
        (json.eventos ?? []).map(
          (e: { id: string; titulo: string; data: string; local: string | null; link: string | null }): AgendaItem => ({
            data: e.data,
            tipo: "google",
            titulo: e.titulo,
            ref_id: e.id,
            local: e.local,
            link: e.link,
          })
        )
      );
    } catch {
      setGoogleOn(false);
    }
  }

  async function sincronizar() {
    setSincronizando(true);
    try {
      await fetch("/api/google/push", { method: "POST" });
      await Promise.all([carregarMemo(), carregarGoogle()]);
    } finally {
      setSincronizando(false);
    }
  }

  useEffect(() => {
    const hoje = new Date();
    setRef({ y: hoje.getFullYear(), m: hoje.getMonth() });
    Promise.all([carregarMemo(), carregarGoogle()]).then(() => setLoading(false));
  }, []); // eslint-disable-line

  const todos = useMemo(() => [...itens, ...googleItens], [itens, googleItens]);

  const porDia = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const it of todos) {
      const d = it.data?.split("T")[0];
      if (!d) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(it);
    }
    return map;
  }, [todos]);

  function estadoDia(items: AgendaItem[]): "fechada" | "disputa" | "livre" | "google" {
    if (items.some((i) => i.tipo === "fechado")) return "fechada";
    if (items.some((i) => i.tipo === "negociacao")) return "disputa";
    if (items.some((i) => i.tipo === "google")) return "google";
    return "livre";
  }

  if (loading || !ref) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Agenda" />
        <Spinner />
      </div>
    );
  }

  const primeiro = new Date(ref.y, ref.m, 1);
  const inicioSemana = primeiro.getDay();
  const diasNoMes = new Date(ref.y, ref.m + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(inicioSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  function navMes(delta: number) {
    setRef((r) => {
      if (!r) return r;
      const d = new Date(r.y, r.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const hojeISO = toISODate(new Date());
  const futuros = [...todos]
    .filter((i) => i.data)
    .sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Agenda"
        subtitle="Eventos fechados + negociações · sincroniza com o Google Agenda"
        actions={
          <div className="flex items-center gap-2">
            {googleOn && (
              <>
                <Button variant="outline" size="sm" onClick={sincronizar} disabled={sincronizando}>
                  {sincronizando ? "Sincronizando..." : "↻ Sincronizar"}
                </Button>
                <Button size="sm" onClick={() => setNovoOpen(true)}>+ Novo evento</Button>
              </>
            )}
            <div className="flex gap-1">
              <Button variant={view === "mes" ? "primary" : "outline"} size="sm" onClick={() => setView("mes")}>Mês</Button>
              <Button variant={view === "lista" ? "primary" : "outline"} size="sm" onClick={() => setView("lista")}>Lista</Button>
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Legenda */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
          <Legenda cor="bg-green-500" label="Livre" />
          <Legenda cor="bg-amber-500" label="Em disputa (negociação)" />
          <Legenda cor="bg-red-500" label="Fechada (contrato)" />
          <Legenda cor="bg-sky-500" label="Google Agenda (externo)" />
          {googleOn === false && (
            <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
              Google Agenda não configurado
            </span>
          )}
        </div>
        {googleErro && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Erro ao ler o Google Agenda: {googleErro}. Abra <code>/api/google/status</code> (logado) para diagnóstico.
          </div>
        )}

        {view === "mes" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => navMes(-1)} className="rounded-lg px-3 py-1 text-neutral-500 hover:bg-neutral-100">←</button>
              <h2 className="text-base font-semibold">{MESES[ref.m]} {ref.y}</h2>
              <button onClick={() => navMes(1)} className="rounded-lg px-3 py-1 text-neutral-500 hover:bg-neutral-100">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DIAS.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-medium text-neutral-400">{d}</div>
              ))}
              {celulas.map((dia, i) => {
                if (dia === null) return <div key={i} />;
                const iso = toISODate(new Date(ref.y, ref.m, dia));
                const items = porDia.get(iso) ?? [];
                const estado = items.length ? estadoDia(items) : null;
                const cor = estado === "fechada" ? "bg-red-50 border-red-200" : estado === "disputa" ? "bg-amber-50 border-amber-200" : estado === "google" ? "bg-sky-50 border-sky-200" : estado === "livre" ? "bg-green-50 border-green-200" : "border-transparent";
                const isHoje = iso === hojeISO;
                return (
                  <div key={i} className={`min-h-20 rounded-lg border p-1.5 ${cor}`}>
                    <div className={`text-xs font-medium ${isHoje ? "flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white" : "text-neutral-500"}`}>{dia}</div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {items.slice(0, 3).map((it) => (
                        <button
                          key={`${it.tipo}-${it.ref_id}`}
                          onClick={() => setSelecionado(it)}
                          className={`truncate rounded px-1 text-left text-[10px] hover:brightness-95 ${it.tipo === "fechado" ? "bg-red-100 text-red-700" : it.tipo === "google" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}
                          title={it.titulo}
                        >
                          {it.titulo}
                        </button>
                      ))}
                      {items.length > 3 && <div className="text-[10px] text-neutral-400">+{items.length - 3}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {futuros.map((it) => (
              <button
                key={`${it.tipo}-${it.ref_id}`}
                onClick={() => setSelecionado(it)}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-shadow hover:shadow-sm"
              >
                <div className={`h-2.5 w-2.5 rounded-full ${it.tipo === "fechado" ? "bg-red-500" : it.tipo === "google" ? "bg-sky-500" : "bg-amber-500"}`} />
                <div className="w-24 text-sm font-medium text-neutral-600">{formatData(it.data)}</div>
                <div className="flex-1 text-sm font-semibold text-neutral-800">{it.titulo}</div>
                {it.local && <div className="text-xs text-neutral-400">📍 {it.local}</div>}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${it.tipo === "fechado" ? "bg-red-100 text-red-700" : it.tipo === "google" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                  {it.tipo === "fechado" ? "Fechado" : it.tipo === "google" ? "Google" : "Negociação"}
                </span>
              </button>
            ))}
            {futuros.length === 0 && <p className="text-sm text-neutral-400">Nenhum evento na agenda.</p>}
          </div>
        )}
      </div>

      {selecionado && (
        <EventoModal
          evento={selecionado}
          onClose={() => setSelecionado(null)}
          onChange={carregarGoogle}
        />
      )}

      <NovoEventoModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        onCreated={async () => {
          setNovoOpen(false);
          await carregarGoogle();
        }}
      />
    </div>
  );
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
      {label}
    </div>
  );
}
