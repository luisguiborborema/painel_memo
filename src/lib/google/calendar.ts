import "server-only";
import { google } from "googleapis";

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL ?? "";
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "";

export const googleConfigured =
  CLIENT_EMAIL.length > 0 && PRIVATE_KEY.length > 0 && CALENDAR_ID.length > 0;

function getCalendar() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

const MEMO_TAG = "memo_contrato_id";

export type ContratoEvento = {
  id: string;
  titulo: string;
  data: string; // yyyy-mm-dd
  local: string | null;
  descricao?: string | null;
  google_event_id: string | null;
};

// Cria ou atualiza o evento (dia inteiro) de um contrato no calendário da MEMO.
// Retorna o eventId do Google.
export async function upsertEventoContrato(c: ContratoEvento): Promise<string | null> {
  if (!googleConfigured || !c.data) return null;
  const calendar = getCalendar();

  const endExclusive = addDaysISO(c.data, 1); // all-day end é exclusivo
  const requestBody = {
    summary: `💍 ${c.titulo}`,
    location: c.local ?? undefined,
    description: [c.descricao, "\n— Sincronizado do Sistema MEMO"].filter(Boolean).join(" "),
    start: { date: c.data },
    end: { date: endExclusive },
    extendedProperties: { private: { [MEMO_TAG]: c.id } },
  };

  if (c.google_event_id) {
    try {
      const res = await calendar.events.update({
        calendarId: CALENDAR_ID,
        eventId: c.google_event_id,
        requestBody,
      });
      return res.data.id ?? c.google_event_id;
    } catch {
      // evento pode ter sido apagado no Google — recria
    }
  }
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody,
  });
  return res.data.id ?? null;
}

export async function deletarEventoContrato(googleEventId: string): Promise<void> {
  if (!googleConfigured) return;
  const calendar = getCalendar();
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: googleEventId });
  } catch {
    // já removido
  }
}

export type GoogleEvento = {
  id: string;
  titulo: string;
  data: string;
  allDay: boolean;
  horaInicio: string | null; // "HH:MM"
  horaFim: string | null; // "HH:MM"
  local: string | null;
  descricao: string | null;
  participantes: string[];
  link: string | null; // htmlLink para abrir no Google Calendar
  externo: boolean; // true = criado direto no Google (não veio do MEMO)
};

const TIMEZONE = "America/Sao_Paulo";

export type NovoEvento = {
  titulo: string;
  data: string;
  allDay?: boolean;
  horaInicio?: string | null; // "HH:MM"
  horaFim?: string | null; // "HH:MM"
  local?: string | null;
  descricao?: string | null;
  participantes?: string[];
};

function montaStartEnd(ev: NovoEvento) {
  if (ev.allDay === false && ev.horaInicio) {
    const fim = ev.horaFim && ev.horaFim > ev.horaInicio ? ev.horaFim : somaHora(ev.horaInicio, 1);
    return {
      start: { dateTime: `${ev.data}T${ev.horaInicio}:00`, timeZone: TIMEZONE },
      end: { dateTime: `${ev.data}T${fim}:00`, timeZone: TIMEZONE },
    };
  }
  return { start: { date: ev.data }, end: { date: addDaysISO(ev.data, 1) } };
}

// Cria um evento no calendário da MEMO (dia inteiro ou com horário).
export async function criarEvento(ev: NovoEvento): Promise<string | null> {
  if (!googleConfigured || !ev.data) return null;
  const calendar = getCalendar();
  const participantes = (ev.participantes ?? []).map((p) => p.trim()).filter(Boolean);
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: ev.titulo || "(sem título)",
      location: ev.local ?? undefined,
      description: ev.descricao ?? undefined,
      ...montaStartEnd(ev),
      extendedProperties: participantes.length
        ? { private: { participantes: participantes.join(", ") } }
        : undefined,
    },
  });
  return res.data.id ?? null;
}

// Atualiza um evento avulso existente.
export async function atualizarEvento(eventId: string, ev: NovoEvento): Promise<void> {
  if (!googleConfigured) return;
  const calendar = getCalendar();
  const participantes = (ev.participantes ?? []).map((p) => p.trim()).filter(Boolean);
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: {
      summary: ev.titulo || "(sem título)",
      location: ev.local ?? null,
      description: ev.descricao ?? null,
      ...montaStartEnd(ev),
      extendedProperties: { private: { participantes: participantes.join(", ") } },
    },
  });
}

function somaHora(hhmm: string, horas: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h + horas) % 24;
  return `${String(total).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Lista eventos do calendário num intervalo. Marca quais são externos (sem tag MEMO).
export async function listarEventos(fromISO: string, toISO: string): Promise<GoogleEvento[]> {
  if (!googleConfigured) return [];
  const calendar = getCalendar();
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: new Date(fromISO + "T00:00:00Z").toISOString(),
    timeMax: new Date(toISO + "T23:59:59Z").toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });
  const items = res.data.items ?? [];
  return items
    .map((e): GoogleEvento | null => {
      const data = e.start?.date ?? e.start?.dateTime?.slice(0, 10);
      if (!data || !e.id) return null;
      const memoId = e.extendedProperties?.private?.[MEMO_TAG];
      const allDay = !!e.start?.date;
      const partStr = e.extendedProperties?.private?.participantes ?? "";
      return {
        id: e.id,
        titulo: e.summary ?? "(sem título)",
        data,
        allDay,
        horaInicio: e.start?.dateTime ? e.start.dateTime.slice(11, 16) : null,
        horaFim: e.end?.dateTime ? e.end.dateTime.slice(11, 16) : null,
        local: e.location ?? null,
        descricao: e.description ?? null,
        participantes: partStr ? partStr.split(",").map((p) => p.trim()).filter(Boolean) : [],
        link: e.htmlLink ?? null,
        externo: !memoId,
      };
    })
    .filter((x): x is GoogleEvento => x !== null);
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}
