import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured, listarEventos } from "@/lib/google/calendar";

// GET /api/google/events?from=yyyy-mm-dd&to=yyyy-mm-dd
// Retorna eventos EXTERNOS do Google (criados direto lá, não vindos do MEMO).
export async function GET(req: NextRequest) {
  if (!googleConfigured) {
    return NextResponse.json({ configured: false, eventos: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? isoHoje(-180);
  const to = searchParams.get("to") ?? isoHoje(540);

  try {
    const todos = await listarEventos(from, to);
    const eventos = todos.filter((e) => e.externo); // evita duplicar o que o MEMO já mostra
    return NextResponse.json({ configured: true, eventos });
  } catch (e) {
    return NextResponse.json({ configured: true, eventos: [], error: (e as Error).message });
  }
}

function isoHoje(offsetDias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}
