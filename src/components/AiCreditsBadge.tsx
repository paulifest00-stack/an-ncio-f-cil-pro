import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Key,
  RefreshCw,
  Sparkles,
  Zap,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  checkDetailedAiHealthServer,
  type DetailedAiHealthResult,
} from "@/lib/ai/credits.functions";
import {
  getStoredUserKeysConfig,
  type UserKeysStorage,
} from "@/lib/ai/user-keys";
import { AiKeyManagerModal } from "@/components/AiKeyManagerModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

let memoryHealthCache: { result: DetailedAiHealthResult; timestamp: number } | null = null;

export function AiCreditsBadge() {
  const [health, setHealth] = useState<DetailedAiHealthResult | null>(
    () => memoryHealthCache?.result ?? null
  );
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [config, setConfig] = useState<UserKeysStorage>({ selectedKeyId: "auto", keys: [] });

  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    // 0ms instant response from cache if fresh (< 45s)
    if (!force && memoryHealthCache && now - memoryHealthCache.timestamp < 45000) {
      setHealth(memoryHealthCache.result);
      return;
    }

    setLoading(true);
    try {
      const currentConfig = getStoredUserKeysConfig();
      setConfig(currentConfig);

      const res = await checkDetailedAiHealthServer({
        data: {
          userKeys: currentConfig.keys.map((k) => ({
            id: k.id,
            key: k.key,
            name: k.name,
            enabled: k.enabled,
          })),
          selectedKeyId: currentConfig.selectedKeyId,
        },
      });
      memoryHealthCache = { result: res, timestamp: Date.now() };
      setHealth(res);
    } catch (err) {
      console.error("Erro ao verificar saúde das chaves de IA:", err);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    void refresh();
    const sync = () => {
      setConfig(getStoredUserKeysConfig());
      void refresh();
    };
    window.addEventListener("af:keys-updated", sync);
    return () => {
      window.removeEventListener("af:keys-updated", sync);
    };
  }, [refresh]);

  const isAuto = config.selectedKeyId === "auto";

  const getStatusColor = () => {
    if (!health) return "bg-muted-foreground";
    if (health.overallStatus === "ok") return "bg-emerald-500";
    if (health.overallStatus === "sem_creditos") return "bg-rose-500";
    if (health.overallStatus === "limite_temporario") return "bg-amber-500";
    return "bg-neutral-500";
  };

  const getStatusText = () => {
    if (!health) return "Verificando IA...";
    if (health.overallStatus === "ok") {
      return isAuto
        ? `IA: Auto (${health.totalWorkingKeys} chave${health.totalWorkingKeys > 1 ? "s" : ""})`
        : `IA: ${health.activeKeyLabel.replace("Manual: ", "")}`;
    }
    if (health.overallStatus === "sem_creditos") return "IA: Créditos Esgotados";
    if (health.overallStatus === "limite_temporario") return "IA: Limite 429";
    return "IA: Desconectada";
  };

  const getMobileStatusText = () => {
    if (!health) return "...";
    if (health.overallStatus === "ok") return isAuto ? "Auto" : "Fixa";
    if (health.overallStatus === "sem_creditos") return "402";
    if (health.overallStatus === "limite_temporario") return "429";
    return "Off";
  };

  const getBadgeClass = () => {
    if (!health) return "border-border/80 text-muted-foreground bg-card/90";
    if (health.overallStatus === "ok") {
      return "border-emerald-500/30 text-emerald-900 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15";
    }
    if (health.overallStatus === "sem_creditos") {
      return "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15";
    }
    if (health.overallStatus === "limite_temporario") {
      return "border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15";
    }
    return "border-border/80 text-muted-foreground bg-card/90";
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`group flex items-center gap-1 sm:gap-2 rounded-2xl border px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95 focus:outline-hidden shrink-0 ${getBadgeClass()}`}
            title="Clique para gerenciar chaves e provedor de IA"
          >
            <span className={`size-1.5 sm:size-2 rounded-full shadow-xs shrink-0 transition-colors ${getStatusColor()} ${health?.overallStatus === "ok" ? "animate-pulse" : ""}`} />
            
            {/* Desktop label */}
            <span className="hidden sm:inline truncate max-w-[180px]">
              {getStatusText()}
            </span>

            {/* Mobile compact label */}
            <span className="inline sm:hidden font-mono text-[10px] font-bold">
              IA: {getMobileStatusText()}
            </span>

            <ChevronDown className="size-2.5 sm:size-3 text-muted-foreground opacity-60 transition-transform group-hover:translate-y-0.5" />
          </button>
        </PopoverTrigger>


        <PopoverContent className="w-80 sm:w-96 p-4 rounded-3xl shadow-2xl border border-border/80 bg-card/95 backdrop-blur-2xl" align="end">
          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Key className="size-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Status e Chaves de IA
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {isAuto ? "Modo Automático Ativo" : "Chave Manual Fixada"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Testar conexão das chaves"
              >
                <RefreshCw
                  className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`}
                />
              </button>
            </div>

            {/* Status Principal */}
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  {health?.overallStatus === "ok" ? (
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  ) : health?.overallStatus === "sem_creditos" ? (
                    <XCircle className="size-4 text-rose-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                  )}
                  {health?.overallStatus === "ok" ? "Pronto para Gerar Anúncios" : health?.overallStatus === "sem_creditos" ? "Sem Créditos de IA" : "Atenção na Conexão"}
                </span>

                <span className="text-[10px] font-bold text-muted-foreground">
                  {isAuto ? "Fallback Automático" : "Manual"}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {health?.overallMessage || "Verificando disponibilidade das chaves de API..."}
              </p>
            </div>

            {/* Resumo das Chaves Cadastradas */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Chaves Cadastradas ({health?.serverKeys.length ? 1 : 0} Servidor + {config.keys.length} Suas)
              </span>

              <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                {/* Servidor */}
                {health?.serverKeys.map((sk) => (
                  <div key={sk.id} className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/60 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`size-1.5 rounded-full shrink-0 ${sk.status === "ok" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className="font-medium text-foreground truncate">{sk.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                      {sk.status === "ok" ? "OK" : "Esgotada (402)"}
                    </span>
                  </div>
                ))}

                {/* Usuário */}
                {config.keys.map((uk) => {
                  const tested = health?.userKeys.find((k) => k.id === uk.id);
                  const isOk = tested ? tested.status === "ok" : uk.lastStatus === "ok";
                  const isExhausted = tested ? tested.status === "sem_creditos" : uk.lastStatus === "sem_creditos";

                  return (
                    <div key={uk.id} className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/60 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`size-1.5 rounded-full shrink-0 ${isOk ? "bg-emerald-500" : isExhausted ? "bg-rose-500" : "bg-amber-500"}`} />
                        <span className="font-medium text-foreground truncate">{uk.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                        {isOk ? "OK" : isExhausted ? "Sem Créditos" : "Limite"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botão de Ação: Abrir Gerenciador de Chaves */}
            <div className="border-t border-border/80 pt-2.5">
              <Button
                type="button"
                onClick={() => {
                  setPopoverOpen(false);
                  setKeyModalOpen(true);
                }}
                className="w-full justify-center gap-2 rounded-2xl text-xs font-bold h-9 shadow-md"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>Gerenciar, Renomear e Alternar Chaves</span>
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AiKeyManagerModal open={keyModalOpen} onOpenChange={setKeyModalOpen} />
    </>
  );
}


