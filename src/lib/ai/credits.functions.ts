import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getApiKeys, getServerKeysList, testSingleKey } from "./gateway.server";

export type AiStatus = "ok" | "sem_creditos" | "limite_temporario" | "indisponivel";

export interface KeyHealthDetail {
  id: string;
  name: string;
  isServer: boolean;
  maskedKey: string;
  provider: "lovable" | "gemini_direct";
  status: "ok" | "sem_creditos" | "limite_temporario" | "invalida" | "erro";
  message: string;
  testedAt: string;
  enabled?: boolean;
}

export interface DetailedAiHealthResult {
  overallStatus: AiStatus;
  overallMessage: string;
  selectedKeyId: string;
  activeKeyLabel: string;
  serverKeys: KeyHealthDetail[];
  userKeys: KeyHealthDetail[];
  totalAvailableKeys: number;
  totalWorkingKeys: number;
  checkedAt: string;
}

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
 * Endpoint temporário para capturar a chave de API crua do servidor Lovable
 */
export const revealLovableKeyServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    key: string | null;
    allKeys: Array<{ id: string; key: string; provider: string }>;
  }> => {
    const { getApiKeys } = await import("./gateway.server");
    const serverKeys = getApiKeys([]);
    const primary =
      process.env["LOVABLE_API_KEY"] ||
      process.env["LOVABLE_API_KEYS"] ||
      serverKeys[0]?.key ||
      null;
    return {
      key: primary,
      allKeys: serverKeys.map((k) => ({ id: k.id, key: k.key, provider: k.provider })),
    };
  },
);

/**
 * Valida uma chave individualmente (útil quando o usuário insere uma chave na UI).
 */
export const validateSingleKeyServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ apiKey: z.string().min(5) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    return testSingleKey(data.apiKey);
  });

/**
 * Verifica detalhadamente o status e créditos de cada chave (servidor + usuário)
 */
export const checkDetailedAiHealthServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        userKeys: z
          .array(
            z.object({
              id: z.string(),
              key: z.string(),
              name: z.string().optional(),
              enabled: z.boolean().optional(),
            }),
          )
          .optional(),
        selectedKeyId: z.string().optional(),
      })
      .optional()
      .parse(data),
  )
  .handler(async ({ data }): Promise<DetailedAiHealthResult> => {
    const checkedAt = new Date().toISOString();
    const selectedKeyId = data?.selectedKeyId || "auto";
    const clientUserKeys = data?.userKeys || [];

    const testKeyDirect = async (
      rawKey: string,
      provider: "lovable" | "gemini_direct",
    ): Promise<{ status: KeyHealthDetail["status"]; message: string }> => {
      const baseUrl =
        provider === "gemini_direct"
          ? "https://generativelanguage.googleapis.com/v1beta/openai"
          : "https://ai.gateway.lovable.dev/v1";
      const model =
        provider === "gemini_direct" ? "gemini-2.5-flash" : "google/gemini-3.7-flash";

      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 2,
          }),
        });

        if (res.ok) {
          return { status: "ok", message: "Chave ativa • Créditos disponíveis" };
        }
        if (res.status === 402) {
          return { status: "sem_creditos", message: "Créditos de IA esgotados (Erro 402)" };
        }
        if (res.status === 429) {
          return { status: "limite_temporario", message: "Limite temporário de requisições (429)" };
        }
        if (res.status === 401) {
          return { status: "invalida", message: "Chave inválida ou revogada (Erro 401)" };
        }
        return { status: "erro", message: `Erro HTTP ${res.status}` };
      } catch (err) {
        return {
          status: "erro",
          message: err instanceof Error ? err.message : "Falha de conexão",
        };
      }
    };

    // 1. Testa chaves do Servidor (.env)
    const serverKeyList = getServerKeysList();
    const serverKeysRaw = getApiKeys([]);
    const testedServerKeys: KeyHealthDetail[] = [];

    for (let i = 0; i < serverKeyList.length; i++) {
      const sInfo = serverKeyList[i];
      const sRaw = serverKeysRaw[i];
      if (sRaw) {
        const testRes = await testKeyDirect(sRaw.key, sInfo.provider);
        testedServerKeys.push({
          id: sInfo.id,
          name: sInfo.name,
          isServer: true,
          maskedKey: sInfo.maskedKey,
          provider: sInfo.provider,
          status: testRes.status,
          message: testRes.message,
          testedAt: checkedAt,
        });
      }
    }

    // 2. Testa chaves do Usuário
    const testedUserKeys: KeyHealthDetail[] = [];
    for (const uk of clientUserKeys) {
      const provider = uk.key.startsWith("AIzaSy") ? "gemini_direct" : "lovable";
      const maskedKey = `${uk.key.slice(0, 8)}...${uk.key.slice(-6)}`;
      const testRes = await testKeyDirect(uk.key, provider);
      testedUserKeys.push({
        id: uk.id,
        name: uk.name || `Chave (${maskedKey})`,
        isServer: false,
        maskedKey,
        provider,
        status: testRes.status,
        message: testRes.message,
        testedAt: checkedAt,
        enabled: uk.enabled !== false,
      });
    }

    // 3. Determina status global e qual chave está ativa
    let activeLabel = "Nenhuma chave ativa";
    let workingCount = 0;

    const allKeysCombined = [
      ...testedUserKeys.filter((k) => k.enabled !== false),
      ...testedServerKeys,
    ];

    const workingKeys = allKeysCombined.filter((k) => k.status === "ok");
    workingCount = workingKeys.length;

    let overallStatus: AiStatus = "indisponivel";
    let overallMessage = "";

    if (selectedKeyId !== "auto") {
      // Modo manual
      const selected =
        testedUserKeys.find((k) => k.id === selectedKeyId) ||
        testedServerKeys.find((k) => k.id === selectedKeyId);

      if (selected) {
        activeLabel = `Manual: ${selected.name}`;
        if (selected.status === "ok") {
          overallStatus = "ok";
          overallMessage = `Chave manual ativa: ${selected.name} (Pronta para uso)`;
        } else if (selected.status === "sem_creditos") {
          overallStatus = "sem_creditos";
          overallMessage = `Chave manual ${selected.name} está SEM CRÉDITOS. Selecione outra chave ou use o modo Automático.`;
        } else if (selected.status === "limite_temporario") {
          overallStatus = "limite_temporario";
          overallMessage = `Chave manual ${selected.name} em limite temporário (429).`;
        } else {
          overallStatus = "indisponivel";
          overallMessage = `Chave manual ${selected.name} indisponível (${selected.message}).`;
        }
      } else {
        overallStatus = "indisponivel";
        overallMessage = "A chave selecionada manualmente não foi encontrada.";
      }
    } else {
      // Modo automático
      if (workingKeys.length > 0) {
        overallStatus = "ok";
        activeLabel = `Auto: ${workingKeys[0].name}`;
        overallMessage = `Modo Automático ativo (${workingKeys.length} chave(s) operando com créditos e fallback).`;
      } else {
        const hasSemCreditos = allKeysCombined.some((k) => k.status === "sem_creditos");
        if (hasSemCreditos) {
          overallStatus = "sem_creditos";
          overallMessage = "Todas as chaves cadastradas estão com CRÉDITOS ESGOTADOS. Adicione uma nova chave para continuar.";
        } else {
          overallStatus = "indisponivel";
          overallMessage = "Nenhuma chave de IA está funcionando no momento. Adicione uma chave válida.";
        }
      }
    }

    return {
      overallStatus,
      overallMessage,
      selectedKeyId,
      activeKeyLabel: activeLabel,
      serverKeys: testedServerKeys,
      userKeys: testedUserKeys,
      totalAvailableKeys: allKeysCombined.length,
      totalWorkingKeys: workingCount,
      checkedAt,
    };
  });

/**
 * Verificação rápida de saúde
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
        const testModel =
          entry.provider === "gemini_direct" ? "gemini-2.5-flash" : "google/gemini-3.7-flash";
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



