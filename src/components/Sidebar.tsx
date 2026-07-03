"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/comercial", label: "Comercial", icon: "💬" },
  { href: "/operacao", label: "Operação", icon: "🎬" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/financeiro", label: "Financeiro", icon: "💰" },
  { href: "/config", label: "Régua & Config", icon: "⚙️" },
];

export function Sidebar({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-4 py-5">
        <div className="flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt="MEMO" className="h-6 w-auto" />
        </div>
        <div className="mt-1.5 text-center text-xs text-neutral-400">Gestão</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-100 px-4 py-3">
        {email && (
          <div className="mb-2 truncate text-xs text-neutral-400">{email}</div>
        )}
        <button
          onClick={sair}
          className="text-xs font-medium text-neutral-500 hover:text-red-600"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
