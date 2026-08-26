/**
 * Camada de acesso ao provedor de IA com suporte a Múltiplas Chaves e Fallback Automático.
 * Toda a aplicação fala apenas com estas funções.
 */

const LOVABLE_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const GEMINI_DIRECT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

export const MODELS = {
  reasoning: "google/gemini-3.7-flash",
  vision: "google/gemini-3.7-flash",
  image: "google/gemini-3.1-flash-image",
} as const;

export interface KeyEntry {
  key: string;
  provider: "lovable" | "gemini_direct";
  baseUrl: string;
  id: string;
}

/**
 * Coleta todas as chaves de API configuradas (chaves customizadas da UI prioritárias + chaves do .env).
 */
export function getApiKeys(customKeys?: string[]): KeyEntry[] {
  const keys: KeyEntry[] = [];
  const seen = new Set<string>();

  const addKey = (rawKey: string | undefined, provider: "lovable" | "gemini_direct") => {
    if (!rawKey) return;
    const parts = rawKey.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);
    for (const k of parts) {
      if (k && !seen.has(k)) {
        seen.add(k);
        keys.push({
          key: k,
          provider: k.startsWith("AIzaSy") ? "gemini_direct" : provider,
          baseUrl: k.startsWith("AIzaSy") ? GEMINI_DIRECT_BASE_URL : LOVABLE_BASE_URL,
          id: `${k.slice(0, 7)}...${k.slice(-6)}`,
        });
      }
    }
  };

  // 1. Chaves customizadas passadas pelo usuário na UI (têm prioridade máxima)
  if (customKeys && Array.isArray(customKeys)) {
    for (const ck of customKeys) {
      addKey(ck, "lovable");
    }
  }

  // 2. Chaves Lovable do servidor (.env)
  addKey(process.env["LOVABLE_API_KEY"], "lovable");
  addKey(process.env["LOVABLE_API_KEYS"], "lovable");
  for (let i = 1; i <= 10; i++) {
    addKey(process.env[`LOVABLE_API_KEY_${i}`], "lovable");
  }

  // 3. Chaves Google Gemini Direct do servidor (.env)
  addKey(process.env["GEMINI_API_KEY"], "gemini_direct");
  addKey(process.env["GEMINI_API_KEYS"], "gemini_direct");
  for (let i = 1; i <= 10; i++) {
    addKey(process.env[`GEMINI_API_KEY_${i}`], "gemini_direct");
  }

  return keys;
}

/**
 * Testa uma chave específica para verificar se ela é válida e tem créditos.
 */
export async function testSingleKey(rawKey: string): Promise<{ ok: boolean; message: string }> {
  const k = rawKey.trim();
  if (!k) return { ok: false, message: "Chave não informada." };
  const provider = k.startsWith("AIzaSy") ? "gemini_direct" : "lovable";
  const baseUrl = provider === "gemini_direct" ? GEMINI_DIRECT_BASE_URL : LOVABLE_BASE_URL;
  const model = provider === "gemini_direct" ? "gemini-2.5-flash" : "google/gemini-3.7-flash";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 2,
      }),
    });

    if (res.ok) {
      return { ok: true, message: "Chave válida e créditos disponíveis!" };
    }
    if (res.status === 402) {
      return { ok: false, message: "Chave sem créditos de IA (Erro 402)." };
    }
    if (res.status === 401) {
      return { ok: false, message: "Chave de API inválida ou incorreta (Erro 401)." };
    }
    if (res.status === 429) {
      return { ok: false, message: "Chave atingiu o limite temporário de requisições (Erro 429)." };
    }
    return { ok: false, message: `Erro ao validar chave (Status ${res.status}).` };
  } catch (e) {
    return { ok: false, message: `Falha na conexão: ${e instanceof Error ? e.message : String(e)}` };
  }
}


function mapError(status: number, body: string): Error {
  if (status === 429) return new Error("Muitas solicitações ou limite de requisições por minuto atingido (429).");
  if (status === 402) return new Error("Créditos de IA insuficientes ou esgotados nesta chave (402).");
  if (status === 403) return new Error("Acesso bloqueado para esta chave de IA (403).");
  if (status === 401) return new Error("Chave de API inválida ou expirada (401).");
  return new Error(`Falha na IA (${status}): ${body.slice(0, 300)}`);
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

/**
 * Executa uma chamada de chat com rotação e fallback automático entre todas as chaves cadastradas.
 */
export async function chat(
  messages: ChatMessage[],
  model: string = MODELS.reasoning,
  customKeys?: string[],
  temperature: number = 0.2,
): Promise<string> {
  const pool = getApiKeys(customKeys);
  if (pool.length === 0) {
    throw new Error("Nenhuma chave de API de IA configurada no servidor (LOVABLE_API_KEY ou GEMINI_API_KEY).");
  }

  let lastError: Error | null = null;

  for (let i = 0; i < pool.length; i++) {
    const entry = pool[i];
    try {
      const actualModel = entry.provider === "gemini_direct" && model.startsWith("google/")
        ? model.replace("google/", "")
        : model;

      const res = await fetch(`${entry.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${entry.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: actualModel, messages, temperature }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        const err = mapError(res.status, errorText);
        console.warn(`[AI Gateway] Chave ${entry.id} (${i + 1}/${pool.length}) falhou: ${err.message}`);
        lastError = err;

        // Se for erro de quota/crédito/rate-limit/auth, tenta a próxima chave do pool imediatamente
        if ([401, 402, 403, 429, 503].includes(res.status) && i < pool.length - 1) {
          console.info(`[AI Gateway] Realizando fallback automático para a chave seguinte...`);
          continue;
        }
        throw err;
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("A IA não retornou conteúdo.");
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < pool.length - 1) {
        console.info(`[AI Gateway] Tentando próxima chave do pool devido a erro: ${lastError.message}`);
        continue;
      }
    }
  }

  throw lastError || new Error("Todas as chaves de API configuradas falharam ao processar a requisição.");
}

export function parseJson<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end >= start) {
    text = text.slice(start, end + 1);
  }
  text = text.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(text) as T;
}

export async function chatJson<T>(
  messages: ChatMessage[],
  model?: string,
  customKeys?: string[],
  temperature?: number,
): Promise<T> {
  return parseJson<T>(await chat(messages, model, customKeys, temperature));
}


/** Gera/edita uma imagem com fallback de chaves preservando o produto da foto original. */
export async function generateImage(
  prompt: string,
  referenceDataUrl?: string,
  customKeys?: string[],
): Promise<string> {
  const pool = getApiKeys(customKeys);
  if (pool.length === 0) {
    throw new Error("Nenhuma chave de API de IA configurada.");
  }

  const content: ContentBlock[] = [{ type: "text", text: prompt }];
  if (referenceDataUrl) content.push({ type: "image_url", image_url: { url: referenceDataUrl } });

  let lastError: Error | null = null;

  for (let i = 0; i < pool.length; i++) {
    const entry = pool[i];
    try {
      const res = await fetch(`${entry.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${entry.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODELS.image,
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        const err = mapError(res.status, errorText);
        console.warn(`[AI Gateway Image] Chave ${entry.id} (${i + 1}/${pool.length}) falhou: ${err.message}`);
        lastError = err;
        if ([401, 402, 403, 429, 503].includes(res.status) && i < pool.length - 1) {
          continue;
        }
        throw err;
      }

      const json = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error("A IA não retornou imagem.");
      return `data:image/png;base64,${b64}`;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < pool.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error("Falha na geração de imagem com as chaves disponíveis.");
}


