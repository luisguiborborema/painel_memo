"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OperacaoColuna } from "@/lib/types";
import { OPERACAO_COLUNAS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { Button, Spinner } from "@/components/ui";
import { Kanban } from "@/components/Kanban";
import { OperacaoCard, type OpCardFull } from "./OperacaoCard";
import { OperacaoDetalhe } from "./OperacaoDetalhe";
import { NovoOperacaoModal } from "./NovoOperacaoModal";

export default function OperacaoPage() {
  const supabase = createClient();
  const [cards, setCards] = useState<OpCardFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<OpCardFull | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

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
        actions={<Button onClick={() => setNovoOpen(true)}>+ Novo card</Button>}
      />
      {loading ? (
        <Spinner />
      ) : (
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
          />
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
