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
