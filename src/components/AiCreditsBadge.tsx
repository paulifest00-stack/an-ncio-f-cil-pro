import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { checkAiStatus, type AiStatusResult } from "@/lib/ai/credits.functions";
import { usageSummary, type UsageSummary } from "@/lib/usage";

const DOT: Record<AiStatusResult["status"], string> = {
  ok: "bg-emerald-500",
  sem_creditos: "bg-red-500",
  limite_temporario: "bg-amber-500",
  indisponivel: "bg-muted-foreground",
};

const LABEL: Record<AiStatusResult["status"], string> = {
  ok: "IA disponível",
  sem_creditos: "Sem créditos",
  limite_temporario: "Limite atingido",
  indisponivel: "IA indisponível",
};

export function AiCreditsBadge() {
  const [state, setState] = useState<AiStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageSummary>({ hojeTexto: 0, hojeImagem: 0, mesTexto: 0, mesImagem: 0 });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setState(await checkAiStatus());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sync = () => setUsage(usageSummary());
    sync();
    window.addEventListener("af:usage", sync);
    return () => window.removeEventListener("af:usage", sync);
  }, [refresh]);

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${state ? DOT[state.status] : "bg-muted-foreground"}`} />
        <span className="font-medium">{state ? LABEL[state.status] : "Verificando..."}</span>
        <button
          onClick={() => void refresh()}
          className="ml-1 text-muted-foreground hover:text-foreground"
          title="Verificar novamente"
          aria-label="Verificar créditos de IA"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        </button>
      </div>
      <p className="mt-1 text-muted-foreground">
        Hoje: {usage.hojeTexto} anúncios · {usage.hojeImagem} imagens — Mês: {usage.mesTexto} · {usage.mesImagem}
      </p>
      {state && state.status !== "ok" ? <p className="mt-1 max-w-[15rem] text-muted-foreground">{state.message}</p> : null}
    </div>
  );
}
