"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OperacaoColuna } from "@/lib/types";
import { OPERACAO_COLUNAS } from "@/lib/constants";
import { brl } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button, Spinner } from "@/components/ui";
import { Kanban } from "@/components/Kanban";
import { OperacaoCard, type OpCardFull } from "./OperacaoCard";
import { OperacaoLista } from "./OperacaoLista";
import { OperacaoDetalhe } from "./OperacaoDetalhe";
import { NovoOperacaoModal } from "./NovoOperacaoModal";

export default function OperacaoPage() {
  const supabase = createClient();
  const [cards, setCards] = useState<OpCardFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<OpCardFull | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [view, setView] = useState<"kanban" | "lista">("kanban");

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("operacao_cards")
      .select("*, contrato:contratos(*)")
      .eq("arquivado", false)
      .order("created_at");
    setCards((data as OpCardFull[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (sel) {
      const atual = cards.find((c) => c.id === sel.id);
      if (atual) setSel(atual);
    }
  }, [cards]); // eslint-disable-line

  async function mover(card: OpCardFull, coluna: OperacaoColuna) {
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, coluna_atual: coluna } : c)));
    await supabase.from("operacao_cards").update({ coluna_atual: coluna }).eq("id", card.id);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Operação"
        subtitle="Onboarding → produção → entrega"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button variant={view === "kanban" ? "primary" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
              <Button variant={view === "lista" ? "primary" : "outline"} size="sm" onClick={() => setView("lista")}>Lista</Button>
            </div>
            <Button onClick={() => setNovoOpen(true)}>+ Novo card</Button>
          </div>
        }
      />
      {loading ? (
        <Spinner />
      ) : view === "kanban" ? (
        <div className="min-h-0 flex-1 pt-4">
          <Kanban<OperacaoColuna, OpCardFull>
            colunas={OPERACAO_COLUNAS.map((c) => ({
              key: c.key,
              label: c.label,
              hint: c.condicional ? "Condicional (se contratado)" : undefined,
            }))}
            itens={cards}
            colunaDe={(c) => c.coluna_atual}
            onMove={mover}
            renderCard={(c) => <OperacaoCard card={c} onClick={() => setSel(c)} />}
            renderFooter={(_col, items) => {
              const total = items.reduce((s, c) => s + (c.contrato?.valor_total ?? 0), 0);
              return (
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>{items.length} card(s)</span>
                  <span className="font-semibold text-neutral-700">{brl(total)}</span>
                </div>
              );
            }}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <OperacaoLista cards={cards} onSelect={setSel} />
        </div>
      )}
      {sel && (
        <OperacaoDetalhe card={sel} onClose={() => setSel(null)} onChange={carregar} />
      )}

      <NovoOperacaoModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        onCreated={async () => {
          setNovoOpen(false);
          await carregar();
        }}
      />
    </div>
  );
}
