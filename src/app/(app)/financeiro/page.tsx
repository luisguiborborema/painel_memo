"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Receber } from "./Receber";
import { Pagar } from "./Pagar";
import { Calculadora } from "./Calculadora";

type Tab = "receber" | "pagar" | "calculadora";

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("receber");

  const TabBtn = ({ id, children }: { id: Tab; children: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${
        tab === id ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Financeiro"
        subtitle="Contas a receber, a pagar e calculadora de evento"
        tabs={
          <>
            <TabBtn id="receber">Contas a receber</TabBtn>
            <TabBtn id="pagar">Contas a pagar</TabBtn>
            <TabBtn id="calculadora">Calculadora de evento</TabBtn>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "receber" && <Receber />}
        {tab === "pagar" && <Pagar />}
        {tab === "calculadora" && <Calculadora />}
      </div>
    </div>
  );
}
