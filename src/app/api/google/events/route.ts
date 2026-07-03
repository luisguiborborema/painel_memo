import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured, listarEventos, criarEvento } from "@/lib/google/calendar";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// GET /api/google/events?from=yyyy-mm-dd&to=yyyy-mm-dd
// Retorna eventos EXTERNOS do Google (criados direto lá, não vindos do MEMO).
export async function GET(req: NextRequest) {
  if (!googleConfigured) {
    return NextResponse.json({ configured: false, eventos: [] });
  }

  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

// POST /api/google/events — cria um evento avulso (dia inteiro) no Google.
export async function POST(req: NextRequest) {
  if (!googleConfigured) return NextResponse.json({ configured: false }, { status: 400 });
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { titulo?: string; data?: string; local?: string; descricao?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* noop */
  }
  if (!body.titulo?.trim() || !body.data) {
    return NextResponse.json({ error: "título e data são obrigatórios" }, { status: 400 });
  }

  try {
    const id = await criarEvento({
      titulo: body.titulo.trim(),
      data: body.data,
      local: body.local ?? null,
      descricao: body.descricao ?? null,
    });
    return NextResponse.json({ configured: true, id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
