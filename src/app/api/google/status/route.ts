import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

// GET /api/google/status — diagnóstico da integração (requer login).
// Mostra config, tenta listar eventos num intervalo largo e retorna o erro real.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL ?? "";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const key = rawKey.replace(/\\n/g, "\n");
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "";

  const diag: Record<string, unknown> = {
    configurado: clientEmail.length > 0 && key.length > 0 && calendarId.length > 0,
    client_email: clientEmail || "(vazio)",
    calendar_id: calendarId || "(vazio)",
    private_key_len: rawKey.length,
    private_key_ok: key.includes("BEGIN PRIVATE KEY") && key.includes("END PRIVATE KEY"),
  };

  if (!diag.configurado) {
    diag.dica = "Faltam variáveis. Confira GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_CALENDAR_ID na Vercel (Production) e refaça o deploy.";
    return NextResponse.json(diag);
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 2);

    const res = await calendar.events.list({
      calendarId,
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });
    const items = res.data.items ?? [];
    diag.ok = true;
    diag.total_eventos = items.length;
    diag.exemplos = items.slice(0, 8).map((e) => ({
      titulo: e.summary,
      data: e.start?.date ?? e.start?.dateTime,
      memo: !!e.extendedProperties?.private?.memo_contrato_id,
    }));
  } catch (e) {
    const err = e as { message?: string; code?: number; errors?: unknown };
    diag.ok = false;
    diag.erro = err.message ?? String(e);
    diag.codigo = err.code;
    if (err.code === 404) diag.dica = "Calendário não encontrado ou não compartilhado com a service account. Confira o GOOGLE_CALENDAR_ID e o compartilhamento no Google Agenda.";
    if (err.code === 403) diag.dica = "Sem permissão. Compartilhe o calendário com o client_email da service account (Fazer alterações nos eventos) e ative a Google Calendar API.";
    if (String(diag.erro).toLowerCase().includes("invalid_grant") || String(diag.erro).toLowerCase().includes("decoder")) diag.dica = "Chave privada inválida — provável problema de formatação do GOOGLE_PRIVATE_KEY (quebras de linha).";
  }

  return NextResponse.json(diag);
}
