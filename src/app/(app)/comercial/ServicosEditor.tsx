"use client";

import type { ServicoValor } from "@/lib/types";
import { useServicos } from "@/lib/useServicos";
import { brl } from "@/lib/format";

// Multiseleção de serviços; cada selecionado vira uma linha com campo de valor.
export function ServicosEditor({
  value,
  onChange,
  onBlurSave,
}: {
  value: ServicoValor[];
  onChange: (next: ServicoValor[]) => void;
  onBlurSave?: () => void;
}) {
  const { servicos } = useServicos();
  const selecionados = value ?? [];
  const nomesSel = new Set(selecionados.map((s) => s.nome));

  function toggle(nome: string) {
    if (nomesSel.has(nome)) {
      onChange(selecionados.filter((s) => s.nome !== nome));
    } else {
      onChange([...selecionados, { nome, valor: 0 }]);
    }
  }

  function setValor(nome: string, valor: number) {
    onChange(selecionados.map((s) => (s.nome === nome ? { ...s, valor } : s)));
  }

  const total = selecionados.reduce((s, x) => s + (Number(x.valor) || 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {servicos.map((s) => {
          const on = nomesSel.has(s.nome);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.nome)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                on ? s.cor : "border-neutral-200 bg-white text-neutral-400"
              }`}
            >
              {on ? "✓ " : ""}{s.nome}
            </button>
          );
        })}
      </div>

      {selecionados.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {selecionados.map((s) => (
            <div key={s.nome} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-neutral-700">{s.nome}</span>
              <div className="flex items-center rounded-lg border border-neutral-300 px-2 focus-within:border-neutral-900">
                <span className="text-xs text-neutral-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={s.valor || ""}
                  onChange={(e) => setValor(s.nome, Number(e.target.value))}
                  onBlur={onBlurSave}
                  placeholder="0,00"
                  className="w-28 px-2 py-1.5 text-sm outline-none"
                />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-neutral-100 pt-1.5 text-sm">
            <span className="text-neutral-500">Total sugerido</span>
            <span className="font-semibold text-neutral-800">{brl(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
