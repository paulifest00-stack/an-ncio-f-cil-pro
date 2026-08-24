import { createServerFn } from "@tanstack/react-start";

export type AiStatus = "ok" | "sem_creditos" | "limite_temporario" | "indisponivel";

export interface AiStatusResult {
  status: AiStatus;
  message: string;
  checkedAt: string;
}

/**
 * O provedor de IA não expõe um saldo numérico.
 * Fazemos uma chamada mínima (custo desprezível) para saber se ainda dá para gerar.
 */
export const checkAiStatus = createServerFn({ method: "POST" }).handler(async (): Promise<AiStatusResult> => {
  const checkedAt = new Date().toISOString();
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    return { status: "indisponivel", message: "Serviço de IA não configurado.", checkedAt };
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [{ role: "user", content: "ok" }],
        max_tokens: 1,
      }),
    });

    if (res.ok) {
      return { status: "ok", message: "Créditos disponíveis — pode gerar normalmente.", checkedAt };
    }
    if (res.status === 402) {
      return {
        status: "sem_creditos",
        message: "Sem créditos de IA no momento. Só volta a gerar quando o saldo for renovado ou recarregado.",
        checkedAt,
      };
    }
    if (res.status === 429) {
      return {
        status: "limite_temporario",
        message: "Limite de uso atingido agora. Costuma liberar em alguns minutos ou no próximo ciclo.",
        checkedAt,
      };
    }
    return { status: "indisponivel", message: `IA indisponível (erro ${res.status}).`, checkedAt };
  } catch {
    return { status: "indisponivel", message: "Não foi possível falar com o serviço de IA.", checkedAt };
  }
});
