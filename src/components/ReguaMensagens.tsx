"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MsgTemplate } from "@/lib/types";
import { preencheTemplate } from "@/lib/format";
import { Button } from "./ui";

// Exibe os templates da régua com botão "copiar", preenchendo variáveis do card.
export function ReguaMensagens({
  vars,
}: {
  vars: Record<string, string | null | undefined>;
}) {
  const [templates, setTemplates] = useState<MsgTemplate[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("msg_templates")
      .select("*")
      .order("ordem")
      .then(({ data }) => {
        setTemplates(data ?? []);
        setLoading(false);
      });
  }, []);

  async function copiar(t: MsgTemplate) {
    const texto = preencheTemplate(t.corpo, vars);
    await navigator.clipboard.writeText(texto);
    setCopiado(t.id);
    setTimeout(() => setCopiado((c) => (c === t.id ? null : c)), 1500);
  }

  if (loading)
    return <p className="text-sm text-neutral-400">Carregando templates...</p>;

  return (
    <div className="flex flex-col gap-2">
      {templates.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600">
              {t.titulo}
            </span>
            <Button size="sm" variant="subtle" onClick={() => copiar(t)}>
              {copiado === t.id ? "✓ Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-xs text-neutral-600">
            {preencheTemplate(t.corpo, vars)}
          </p>
        </div>
      ))}
    </div>
  );
}
