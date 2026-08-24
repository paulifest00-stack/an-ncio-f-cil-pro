const KEY = "af:usage:v1";
const QUOTA_KEY = "af:quota:v1";
const DEFAULT_QUOTA = 50; // Quota padrão estimada de operações/mês

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
  totalOperacoesMes: number;
  limiteMensal: number;
  porcentagemUsada: number;
  restante: number;
  nivelUso: "baixo" | "medio" | "alto" | "esgotado";
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

export function getMonthlyQuota(): number {
  if (typeof window === "undefined") return DEFAULT_QUOTA;
  try {
    const raw = window.localStorage.getItem(QUOTA_KEY);
    if (!raw) return DEFAULT_QUOTA;
    const val = parseInt(raw, 10);
    return isNaN(val) || val <= 0 ? DEFAULT_QUOTA : val;
  } catch {
    return DEFAULT_QUOTA;
  }
}

export function setMonthlyQuota(quota: number) {
  if (typeof window === "undefined") return;
  const validQuota = Math.max(5, Math.min(1000, quota));
  window.localStorage.setItem(QUOTA_KEY, validQuota.toString());
  window.dispatchEvent(new Event("af:usage"));
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
  const sameMonth = (d: Date) =>
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  let hojeTexto = 0;
  let hojeImagem = 0;
  let mesTexto = 0;
  let mesImagem = 0;

  for (const e of read()) {
    const d = new Date(e.at);
    if (sameMonth(d)) e.kind === "texto" ? mesTexto++ : mesImagem++;
    if (sameDay(d)) e.kind === "texto" ? hojeTexto++ : hojeImagem++;
  }

  const limiteMensal = getMonthlyQuota();
  // Peso: 1 anúncio completo consome ~1.5 operações equivalentes, 1 imagem ~1
  const totalOperacoesMes = mesTexto * 1.5 + mesImagem;
  const porcentagemUsada = Math.min(
    100,
    Math.round((totalOperacoesMes / limiteMensal) * 100),
  );
  const restante = Math.max(0, Math.round(limiteMensal - totalOperacoesMes));

  let nivelUso: UsageSummary["nivelUso"] = "baixo";
  if (porcentagemUsada >= 100) nivelUso = "esgotado";
  else if (porcentagemUsada >= 80) nivelUso = "alto";
  else if (porcentagemUsada >= 50) nivelUso = "medio";

  return {
    hojeTexto,
    hojeImagem,
    mesTexto,
    mesImagem,
    totalOperacoesMes,
    limiteMensal,
    porcentagemUsada,
    restante,
    nivelUso,
  };
}
