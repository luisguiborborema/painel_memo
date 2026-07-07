"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SERVICOS } from "@/lib/constants";
import type { ServicoConfig } from "@/lib/types";

// Fallback (lista fixa) caso a tabela servicos_config ainda não exista/esteja vazia.
const FALLBACK: ServicoConfig[] = SERVICOS.map((s, i) => ({
  id: s.key,
  nome: s.label,
  cor: s.cor,
  ordem: i + 1,
  ativo: true,
  created_at: "",
}));

// Cache em memória: a lista de serviços muda raramente, então buscamos uma vez
// por sessão e reusamos entre navegações/componentes (evita query a cada mount).
let cache: ServicoConfig[] | null = null;
let inflight: Promise<ServicoConfig[]> | null = null;

async function fetchServicos(): Promise<ServicoConfig[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("servicos_config")
    .select("*")
    .eq("ativo", true)
    .order("ordem");
  return !error && data && data.length > 0 ? (data as ServicoConfig[]) : FALLBACK;
}

// Chamar após editar a lista em Config para forçar recarga nos próximos usos.
export function invalidateServicos() {
  cache = null;
  inflight = null;
}

export function useServicos(): { servicos: ServicoConfig[]; loading: boolean } {
  const [servicos, setServicos] = useState<ServicoConfig[]>(cache ?? FALLBACK);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let ativo = true;
    if (cache) {
      setServicos(cache);
      setLoading(false);
      return;
    }
    if (!inflight) inflight = fetchServicos().then((r) => (cache = r));
    inflight.then((r) => {
      if (ativo) {
        setServicos(r);
        setLoading(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  return { servicos, loading };
}
