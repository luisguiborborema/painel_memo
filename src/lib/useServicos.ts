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

// Carrega a lista de serviços disponíveis (editável em Config).
export function useServicos(): { servicos: ServicoConfig[]; loading: boolean } {
  const [servicos, setServicos] = useState<ServicoConfig[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("servicos_config")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setServicos(data as ServicoConfig[]);
        setLoading(false);
      });
  }, []);

  return { servicos, loading };
}
