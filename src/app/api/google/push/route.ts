import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured, upsertEventoContrato } from "@/lib/google/calendar";
import type { Contrato } from "@/lib/types";

// POST /api/google/push  { contratoId?: string }
// Envia (cria/atualiza) contratos fechados para o Google Agenda.
export async function POST(req: NextRequest) {
  if (!googleConfigured) {
    return NextResponse.json({ configured: false, synced: 0 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let contratoId: string | undefined;
  try {
    const body = await req.json();
    contratoId = body?.contratoId;
  } catch {
    /* sem body = todos */
  }

  let q = supabase.from("contratos").select("*").not("data_evento", "is", null);
  if (contratoId) q = q.eq("id", contratoId);
  const { data: contratos } = await q;

  let synced = 0;
  const erros: string[] = [];
  for (const c of (contratos as Contrato[]) ?? []) {
    try {
      const eventId = await upsertEventoContrato({
        id: c.id,
        titulo: `${c.noivo1_nome} & ${c.noivo2_nome}`,
        data: c.data_evento!,
        local: c.local,
        descricao: c.anotacoes_operacao,
        google_event_id: c.google_event_id,
      });
      if (eventId) {
        await supabase
          .from("contratos")
          .update({ google_event_id: eventId, google_synced_at: new Date().toISOString() })
          .eq("id", c.id);
        synced++;
      }
    } catch (e) {
      erros.push(`${c.noivo1_nome}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ configured: true, synced, erros });
}
