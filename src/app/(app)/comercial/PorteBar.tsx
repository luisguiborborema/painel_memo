"use client";

import type { Porte } from "@/lib/types";
import { PORTES, sugestaoPorte } from "@/lib/porte";

// Barra de seleção de porte com sugestão automática pelo nº de convidados.
export function PorteBar({
  porte,
  convidados,
  onChange,
}: {
  porte: Porte | null;
  convidados: number | null;
  // manual = true quando o usuário clica (sobrescreve a sugestão)
  onChange: (porte: Porte, manual: boolean) => void;
}) {
  const sugerido = sugestaoPorte(convidados);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-600">Porte do projeto</span>
        {sugerido && (
          <span className="text-[11px] text-neutral-400">
            Sugestão ({convidados} conv.): {PORTES.find((p) => p.key === sugerido)?.label}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PORTES.map((p) => {
          const on = porte === p.key;
          const isSug = sugerido === p.key && !porte;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.key, true)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                on ? p.cor : isSug ? "border-dashed border-neutral-400 bg-white text-neutral-500" : "border-neutral-200 bg-white text-neutral-400"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
