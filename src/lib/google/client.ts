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

// Cria um evento avulso (dia inteiro) no Google. Retorna true em caso de sucesso.
export async function criarEventoGoogle(ev: {
  titulo: string;
  data: string;
  local?: string;
  descricao?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/google/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ev),
    });
    const json = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
