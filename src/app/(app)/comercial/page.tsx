"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, AgendaItem, LeadColuna } from "@/lib/types";
import { LEAD_COLUNAS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { Button, Spinner } from "@/components/ui";
import { Kanban } from "@/components/Kanban";
import { LeadCard } from "./LeadCard";
import { NovoLeadModal } from "./NovoLeadModal";
import { LeadDetalhe } from "./LeadDetalhe";
import { PassagemBastao } from "./PassagemBastao";

export default function ComercialPage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoOpen, setNovoOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Lead | null>(null);
  const [passagem, setPassagem] = useState<Lead | null>(null);

  const carregar = useCallback(async () => {
    const [{ data: ls }, { data: ag }] = await Promise.all([
      supabase.from("leads").select("*").eq("arquivado", false).order("created_at"),
      supabase.from("v_agenda").select("*"),
    ]);
    setLeads((ls as Lead[]) ?? []);
    setAgenda((ag as AgendaItem[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // mantém o selecionado sincronizado com a lista
  useEffect(() => {
    if (selecionado) {
      const atual = leads.find((l) => l.id === selecionado.id);
      if (atual && atual !== selecionado) setSelecionado(atual);
    }
  }, [leads]); // eslint-disable-line

  async function mover(lead: Lead, coluna: LeadColuna) {
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, coluna_atual: coluna } : l)));
    await supabase.from("leads").update({ coluna_atual: coluna }).eq("id", lead.id);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Comercial"
        subtitle="Captação → qualificação → proposta → fechamento"
        actions={<Button onClick={() => setNovoOpen(true)}>+ Novo lead</Button>}
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="min-h-0 flex-1 pt-4">
          <Kanban<LeadColuna, Lead>
            colunas={LEAD_COLUNAS.map((c) => ({
              key: c.key,
              label: c.label,
              hint: c.key === "fechamento" ? "Saída só via passagem de bastão" : undefined,
            }))}
            itens={leads}
            colunaDe={(l) => l.coluna_atual}
            onMove={mover}
            renderCard={(l) => (
              <LeadCard lead={l} agenda={agenda} onClick={() => setSelecionado(l)} />
            )}
          />
        </div>
      )}

      <NovoLeadModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        agenda={agenda}
        onCreated={async () => {
          setNovoOpen(false);
          await carregar();
        }}
      />

      {selecionado && (
        <LeadDetalhe
          lead={selecionado}
          agenda={agenda}
          onClose={() => setSelecionado(null)}
          onChange={carregar}
          onPassagem={(l) => {
            setSelecionado(null);
            setPassagem(l);
          }}
        />
      )}

      {passagem && (
        <PassagemBastao
          lead={passagem}
          onClose={() => setPassagem(null)}
          onDone={async () => {
            setPassagem(null);
            await carregar();
          }}
        />
      )}
    </div>
  );
}
