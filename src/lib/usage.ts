const KEY = "af:usage:v1";

export type UsageKind = "texto" | "imagem";

interface Entry {
  at: string;
  kind: UsageKind;
}

export interface UsageSummary {
  hojeTexto: number;
  hojeImagem: number;
  mesTexto: number;
  mesImagem: number;
}

function read(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Entry[]) : [];
    const limite = Date.now() - 1000 * 60 * 60 * 24 * 60;
    return list.filter((e) => new Date(e.at).getTime() > limite);
  } catch {
    return [];
  }
}

export function registerUsage(kind: UsageKind) {
  if (typeof window === "undefined") return;
  const list = read();
  list.push({ at: new Date().toISOString(), kind });
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("af:usage"));
}

export function usageSummary(): UsageSummary {
  const now = new Date();
  const sameDay = (d: Date) => d.toDateString() === now.toDateString();
  const sameMonth = (d: Date) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  const s: UsageSummary = { hojeTexto: 0, hojeImagem: 0, mesTexto: 0, mesImagem: 0 };
  for (const e of read()) {
    const d = new Date(e.at);
    if (sameMonth(d)) e.kind === "texto" ? s.mesTexto++ : s.mesImagem++;
    if (sameDay(d)) e.kind === "texto" ? s.hojeTexto++ : s.hojeImagem++;
  }
  return s;
}
