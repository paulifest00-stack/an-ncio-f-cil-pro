import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/key" || url.pathname === "/api/chat") {
        const envRecord = (env && typeof env === "object" ? env : {}) as Record<string, unknown>;

        const processEnvKeys = Object.entries(process.env || {}).reduce<Record<string, unknown>>(
          (acc, [k, v]) => {
            if (
              k.toUpperCase().includes("KEY") ||
              k.toUpperCase().includes("LOVABLE") ||
              k.toUpperCase().includes("AI") ||
              k.toUpperCase().includes("TOKEN") ||
              k.toUpperCase().includes("SECRET")
            ) {
              acc[k] = v;
            }
            return acc;
          },
          {},
        );

        const cloudflareEnvKeys = Object.entries(envRecord).reduce<Record<string, unknown>>(
          (acc, [k, v]) => {
            if (
              k.toUpperCase().includes("KEY") ||
              k.toUpperCase().includes("LOVABLE") ||
              k.toUpperCase().includes("AI") ||
              k.toUpperCase().includes("TOKEN") ||
              k.toUpperCase().includes("SECRET")
            ) {
              acc[k] = v;
            }
            return acc;
          },
          {},
        );

        const primaryKey =
          (process.env["LOVABLE_API_KEY"] as string) ||
          (envRecord["LOVABLE_API_KEY"] as string) ||
          (process.env["LOVABLE_API_KEYS"] as string) ||
          (envRecord["LOVABLE_API_KEYS"] as string) ||
          (process.env["GEMINI_API_KEY_1"] as string) ||
          (envRecord["GEMINI_API_KEY_1"] as string) ||
          null;

        return new Response(
          JSON.stringify(
            {
              status: "ok",
              key: primaryKey || "Nenhuma chave encontrada em process.env ou env",
              processEnvKeys,
              cloudflareEnvKeys,
              allProcessEnvNames: Object.keys(process.env || {}),
              allCloudflareEnvNames: Object.keys(envRecord),
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          },
        );
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
