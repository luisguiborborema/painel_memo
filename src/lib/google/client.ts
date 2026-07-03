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
