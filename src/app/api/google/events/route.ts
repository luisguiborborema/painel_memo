import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured, listarEventos, criarEvento, atualizarEvento, type NovoEvento } from "@/lib/google/calendar";

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

function parseBody(raw: unknown): NovoEvento & { eventId?: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  return {
    eventId: typeof b.eventId === "string" ? b.eventId : undefined,
    titulo: String(b.titulo ?? ""),
    data: String(b.data ?? ""),
    allDay: b.allDay !== false,
    horaInicio: (b.horaInicio as string) || null,
    horaFim: (b.horaFim as string) || null,
    local: (b.local as string) || null,
    descricao: (b.descricao as string) || null,
    participantes: Array.isArray(b.participantes) ? (b.participantes as string[]) : [],
  };
}

// POST /api/google/events — cria um evento no Google (dia inteiro ou com horário).
export async function POST(req: NextRequest) {
  if (!googleConfigured) return NextResponse.json({ configured: false }, { status: 400 });
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let ev: NovoEvento;
  try {
    ev = parseBody(await req.json());
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  if (!ev.titulo.trim() || !ev.data) {
    return NextResponse.json({ error: "título e data são obrigatórios" }, { status: 400 });
  }

  try {
    const id = await criarEvento(ev);
    return NextResponse.json({ configured: true, id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PATCH /api/google/events — edita um evento avulso existente.
export async function PATCH(req: NextRequest) {
  if (!googleConfigured) return NextResponse.json({ configured: false }, { status: 400 });
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: NovoEvento & { eventId?: string };
  try {
    body = parseBody(await req.json());
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  if (!body.eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });
  if (!body.titulo.trim() || !body.data) {
    return NextResponse.json({ error: "título e data são obrigatórios" }, { status: 400 });
  }

  try {
    await atualizarEvento(body.eventId, body);
    return NextResponse.json({ configured: true, ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
