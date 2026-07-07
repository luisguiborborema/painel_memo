"use client";

import { useState, type ReactNode } from "react";

export type KanbanCol<K extends string> = {
  key: K;
  label: string;
  hint?: string;
};

export function Kanban<K extends string, T extends { id: string }>({
  colunas,
  itens,
  colunaDe,
  onMove,
  renderCard,
  renderHeaderExtra,
  renderFooter,
}: {
  colunas: KanbanCol<K>[];
  itens: T[];
  colunaDe: (item: T) => K;
  onMove: (item: T, novaColuna: K) => void;
  renderCard: (item: T) => ReactNode;
  renderHeaderExtra?: (coluna: K, itens: T[]) => ReactNode;
  renderFooter?: (coluna: K, itens: T[]) => ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<K | null>(null);

  return (
    <div className="thin-scroll flex h-full gap-3 overflow-x-auto px-6 pb-6">
      {colunas.map((col) => {
        const cards = itens.filter((i) => colunaDe(i) === col.key);
        const isOver = overCol === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              if (overCol !== col.key) setOverCol(col.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setOverCol((c) => (c === col.key ? null : c));
            }}
            onDrop={() => {
              const item = itens.find((i) => i.id === dragId);
              if (item && colunaDe(item) !== col.key) onMove(item, col.key);
              setDragId(null);
              setOverCol(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl transition-colors ${
              isOver ? "bg-neutral-200/70" : "bg-neutral-100"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-700">
                  {col.label}
                </span>
                <span className="rounded-full bg-neutral-200 px-1.5 text-xs font-medium text-neutral-500">
                  {cards.length}
                </span>
              </div>
              {renderHeaderExtra?.(col.key, cards)}
            </div>
            {col.hint && (
              <p className="px-3 pb-1 text-[11px] text-neutral-400">{col.hint}</p>
            )}
            <div className="thin-scroll flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
              {cards.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`cursor-grab active:cursor-grabbing ${
                    dragId === item.id ? "opacity-40" : ""
                  }`}
                >
                  {renderCard(item)}
                </div>
              ))}
              {cards.length === 0 && (
                <div className="rounded-lg border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
                  Vazio
                </div>
              )}
            </div>
            {renderFooter && (
              <div className="border-t border-neutral-200 px-3 py-2">
                {renderFooter(col.key, cards)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
