import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  Info,
  Loader2,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { checkAiStatus, type AiStatusResult } from "@/lib/ai/credits.functions";
import {
  getMonthlyQuota,
  setMonthlyQuota,
  usageSummary,
  type UsageSummary,
} from "@/lib/usage";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DOT: Record<AiStatusResult["status"], string> = {
  ok: "bg-emerald-500",
  sem_creditos: "bg-rose-500",
  limite_temporario: "bg-amber-500",
  indisponivel: "bg-muted-foreground",
};

const STATUS_TEXT: Record<AiStatusResult["status"], string> = {
  ok: "IA Online",
  sem_creditos: "Sem Créditos",
  limite_temporario: "Limite Atingido",
  indisponivel: "Indisponível",
};

export function AiCreditsBadge() {
  const [state, setState] = useState<AiStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageSummary>(usageSummary());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customQuota, setCustomQuota] = useState<number>(getMonthlyQuota());

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
    const sync = () => {
      setUsage(usageSummary());
      setCustomQuota(getMonthlyQuota());
    };
    sync();
    window.addEventListener("af:usage", sync);
    return () => window.removeEventListener("af:usage", sync);
  }, [refresh]);

  const handleSaveQuota = () => {
    setMonthlyQuota(customQuota);
    setPopoverOpen(false);
  };

  // Cores dinâmicas da barra de progresso baseadas na porcentagem usada
  const getProgressColorClass = () => {
    if (state?.status === "sem_creditos" || usage.porcentagemUsada >= 90) {
      return "bg-rose-500";
    }
    if (usage.porcentagemUsada >= 50) {
      return "bg-amber-500";
    }
    return "bg-emerald-500";
  };

  const getTextColorClass = () => {
    if (state?.status === "sem_creditos" || usage.porcentagemUsada >= 90) {
      return "text-rose-600 dark:text-rose-400";
    }
    if (usage.porcentagemUsada >= 50) {
      return "text-amber-600 dark:text-amber-400";
    }
    return "text-emerald-600 dark:text-emerald-400";
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          className="group rounded-xl border border-border/80 bg-card/90 shadow-xs transition-all hover:border-primary/40 hover:bg-accent/40 focus:outline-hidden"
          title="Clique para ver detalhes do consumo de IA"
        >
          {/* Mobile View (< sm): Pílula compacta */}
          <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold">
            <span
              className={`size-2 rounded-full shadow-xs shrink-0 transition-colors ${
                state ? DOT[state.status] : "bg-muted-foreground"
              }`}
            />
            <span className={`font-mono text-xs font-bold ${getTextColorClass()}`}>
              {usage.porcentagemUsada}%
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">IA</span>
            <ChevronDown className="size-3 text-muted-foreground opacity-60" />
          </div>

          {/* Desktop View (>= sm): Card com barra de progresso */}
          <div className="hidden sm:flex flex-col items-start gap-1.5 px-3.5 py-2 text-left">
            {/* Linha 1: Status + Porcentagem */}
            <div className="flex w-full items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <span
                  className={`size-2 rounded-full shadow-xs transition-colors ${
                    state ? DOT[state.status] : "bg-muted-foreground"
                  }`}
                />
                <span className="text-foreground">
                  {state ? STATUS_TEXT[state.status] : "Verificando..."}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className={`font-mono text-xs font-bold ${getTextColorClass()}`}>
                  {usage.porcentagemUsada}%
                </span>
                <span className="text-[10px] text-muted-foreground">usado</span>
                <ChevronDown className="size-3 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
              </div>
            </div>

            {/* Linha 2: Barra de Progresso Visual */}
            <div className="relative h-1.5 w-full min-w-[140px] overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColorClass()}`}
                style={{ width: `${Math.max(4, usage.porcentagemUsada)}%` }}
              />
            </div>

            {/* Linha 3: Resumo rápido */}
            <div className="flex w-full items-center justify-between text-[10px] text-muted-foreground">
              <span>Hoje: {usage.hojeTexto} ads · {usage.hojeImagem} img</span>
              <span>Restam ~{usage.restante}</span>
            </div>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-4 shadow-lg" align="end">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                Monitor de Consumo da IA
              </h4>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Recarregar status da API"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`}
              />
            </button>
          </div>

          {/* Barra de Progresso em Destaque */}
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Uso da Quota Mensal</span>
              <span className={`font-mono font-bold ${getTextColorClass()}`}>
                {usage.porcentagemUsada}%
              </span>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColorClass()}`}
                style={{ width: `${Math.max(3, usage.porcentagemUsada)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{Math.round(usage.totalOperacoesMes)} geradas no mês</span>
              <span>Meta: {usage.limiteMensal} operações</span>
            </div>
          </div>

          {/* Estatísticas detalhadas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border bg-card p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Hoje
              </span>
              <div className="mt-1 space-y-0.5">
                <p className="font-medium text-foreground">{usage.hojeTexto} Anúncios</p>
                <p className="text-[11px] text-muted-foreground">{usage.hojeImagem} Imagens</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Este Mês
              </span>
              <div className="mt-1 space-y-0.5">
                <p className="font-medium text-foreground">{usage.mesTexto} Anúncios</p>
                <p className="text-[11px] text-muted-foreground">{usage.mesImagem} Imagens</p>
              </div>
            </div>
          </div>

          {state && state.message ? (
            <p className="rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">
              {state.message}
            </p>
          ) : null}

          {/* Ajuste do Limite / Quota Estimada */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="quotaInput" className="text-[11px] font-medium text-muted-foreground">
                Ajustar quota de controle (mês):
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="quotaInput"
                  type="number"
                  min="5"
                  max="1000"
                  value={customQuota}
                  onChange={(e) => setCustomQuota(Number(e.target.value))}
                  className="h-7 w-16 px-2 text-right font-mono text-xs"
                />
                <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={handleSaveQuota}>
                  <Check className="size-3" />
                </Button>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Serve como referência visual para não estourar seus créditos.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
