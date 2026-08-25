/**
 * Camada de acesso ao provedor de IA.
 * Toda a aplicação fala apenas com estas funções — trocar de provedor
 * significa reescrever somente este arquivo.
 */

const BASE_URL = "https://ai.gateway.lovable.dev/v1";

export const MODELS = {
  reasoning: "google/gemini-3.7-flash",
  vision: "google/gemini-3.7-flash",
  image: "google/gemini-3.1-flash-image",
} as const;

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Serviço de IA não configurado.");
  return key;
}

function mapError(status: number, body: string): Error {
  if (status === 429) return new Error("Muitas solicitações em sequência. Aguarde alguns segundos e tente novamente.");
  if (status === 402) return new Error("Créditos de IA insuficientes para concluir a geração.");
  if (status === 403) return new Error("O acesso à IA está bloqueado para este espaço de trabalho.");
  if (status === 401) return new Error("Credencial de IA inválida.");
  return new Error(`Falha na IA (${status}): ${body.slice(0, 300)}`);
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

export async function chat(messages: ChatMessage[], model: string = MODELS.reasoning): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  if (!res.ok) throw mapError(res.status, await res.text().catch(() => ""));
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("A IA não retornou conteúdo.");
  return content;
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

export async function chatJson<T>(messages: ChatMessage[], model?: string): Promise<T> {
  return parseJson<T>(await chat(messages, model));
}

/** Gera/edita uma imagem preservando o produto da foto original. */
export async function generateImage(prompt: string, referenceDataUrl?: string): Promise<string> {
  const content: ContentBlock[] = [{ type: "text", text: prompt }];
  if (referenceDataUrl) content.push({ type: "image_url", image_url: { url: referenceDataUrl } });

  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELS.image,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) throw mapError(res.status, await res.text().catch(() => ""));
  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("A IA não retornou imagem.");
  return `data:image/png;base64,${b64}`;
}
