import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getApiKeys, testSingleKey } from "./gateway.server";

export type AiStatus = "ok" | "sem_creditos" | "limite_temporario" | "indisponivel";

export interface AiStatusResult {
  status: AiStatus;
  message: string;
  checkedAt: string;
  totalKeys?: number;
  activeKeyId?: string;
  serverKeysCount?: number;
  userKeysCount?: number;
}

/**
 * Valida uma chave individualmente (útil quando o usuário insere uma chave na UI).
 */
export const validateSingleKeyServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ apiKey: z.string().min(5) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    return testSingleKey(data.apiKey);
  });

/**
 * Verifica o status de saúde das chaves de API disponíveis no pool (servidor + chaves do usuário).
 */
export const checkAiStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ customKeys: z.array(z.string()).optional() }).optional().parse(data),
  )
  .handler(async ({ data }): Promise<AiStatusResult> => {
    const checkedAt = new Date().toISOString();
    const customKeys = data?.customKeys || [];
    const pool = getApiKeys(customKeys);

    if (pool.length === 0) {
      return {
        status: "indisponivel",
        message: "Nenhuma chave de IA configurada no servidor ou na interface.",
        checkedAt,
        totalKeys: 0,
        userKeysCount: customKeys.length,
      };
    }

    let anyOk = false;
    let activeId = pool[0].id;
    let lastMessage = "";

    for (let i = 0; i < pool.length; i++) {
      const entry = pool[i];
      try {
        const testModel = entry.provider === "gemini_direct" ? "gemini-2.5-flash" : "google/gemini-3.7-flash";
        const res = await fetch(`${entry.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${entry.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 2,
          }),
        });

        if (res.ok) {
          anyOk = true;
          activeId = entry.id;
          break;
        } else if (res.status === 402) {
          lastMessage = `Chave ${entry.id} sem créditos.`;
        } else if (res.status === 429) {
          lastMessage = `Chave ${entry.id} atingiu limite temporário de requisições.`;
        } else {
          lastMessage = `Chave ${entry.id} retornou erro ${res.status}.`;
        }
      } catch {
        lastMessage = `Não foi possível conectar à chave ${entry.id}.`;
      }
    }

    if (anyOk) {
      return {
        status: "ok",
        message: `${pool.length > 1 ? `${pool.length} chaves no pool` : "Chave ativa"} — IA pronta para gerar.`,
        checkedAt,
        totalKeys: pool.length,
        activeKeyId: activeId,
        userKeysCount: customKeys.length,
      };
    }

    return {
      status: lastMessage.includes("créditos") ? "sem_creditos" : "limite_temporario",
      message: `Todas as ${pool.length} chave(s) estão indisponíveis no momento: ${lastMessage}`,
      checkedAt,
      totalKeys: pool.length,
      userKeysCount: customKeys.length,
    };
  });


