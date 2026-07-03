import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured, deletarEventoContrato } from "@/lib/google/calendar";

// POST /api/google/delete  { googleEventId: string }
// Remove o evento correspondente no Google Agenda.
export async function POST(req: NextRequest) {
  if (!googleConfigured) return NextResponse.json({ configured: false });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let googleEventId: string | undefined;
  try {
    const body = await req.json();
    googleEventId = body?.googleEventId;
  } catch {
    /* noop */
  }
  if (!googleEventId) return NextResponse.json({ error: "missing googleEventId" }, { status: 400 });

  await deletarEventoContrato(googleEventId);
  return NextResponse.json({ configured: true, deleted: true });
}
