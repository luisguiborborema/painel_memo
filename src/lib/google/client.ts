// Dispara a sincronização de um contrato com o Google Agenda (fire-and-forget).
// Silencioso: se o Google não estiver configurado, a API responde {configured:false}.
export function syncContratoGoogle(contratoId: string) {
  fetch("/api/google/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contratoId }),
  }).catch(() => {
    /* silencioso */
  });
}

// Remove o evento no Google. Aguarda a resposta para poder encadear a exclusão.
export async function deleteEventoGoogle(googleEventId: string) {
  try {
    await fetch("/api/google/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleEventId }),
    });
  } catch {
    /* silencioso */
  }
}

export type EventoInput = {
  titulo: string;
  data: string;
  allDay: boolean;
  horaInicio?: string;
  horaFim?: string;
  local?: string;
  descricao?: string;
  participantes?: string[];
};

// Cria um evento no Google. Retorna ok/erro.
export async function criarEventoGoogle(ev: EventoInput): Promise<{ ok: boolean; error?: string }> {
  return enviaEvento("POST", ev);
}

// Edita um evento avulso no Google.
export async function editarEventoGoogle(
  eventId: string,
  ev: EventoInput
): Promise<{ ok: boolean; error?: string }> {
  return enviaEvento("PATCH", { ...ev, eventId });
}

async function enviaEvento(method: "POST" | "PATCH", body: object): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/google/events", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
