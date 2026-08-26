import { useEffect, useState } from "react";
import {
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Sparkles,
  Edit2,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Bot,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getStoredUserKeysConfig,
  addUserApiKey,
  removeUserApiKey,
  renameUserApiKey,
  setSelectedKeyMode,
  toggleUserApiKey,
  updateKeyStatus,
  maskKey,
  type StoredUserKey,
  type UserKeysStorage,
} from "@/lib/ai/user-keys";
import {
  checkDetailedAiHealthServer,
  validateSingleKeyServer,
  type DetailedAiHealthResult,
  type KeyHealthDetail,
} from "@/lib/ai/credits.functions";

interface AiKeyManagerModalProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AiKeyManagerModal({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AiKeyManagerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const [config, setConfig] = useState<UserKeysStorage>({ selectedKeyId: "auto", keys: [] });
  const [healthResult, setHealthResult] = useState<DetailedAiHealthResult | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const reloadData = () => {
    setConfig(getStoredUserKeysConfig());
  };

  const runHealthCheck = async (currentConfig = config) => {
    setIsTestingAll(true);
    try {
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
      setHealthResult(res);

      // Atualiza os status no localStorage
      res.userKeys.forEach((uk) => {
        updateKeyStatus(uk.id, uk.status as StoredUserKey["lastStatus"], uk.message);
      });
    } catch (err) {
      console.error("Erro ao verificar saúde das chaves:", err);
    } finally {
      setIsTestingAll(false);
    }
  };

  useEffect(() => {
    reloadData();
    const handleUpdate = () => {
      const c = getStoredUserKeysConfig();
      setConfig(c);
    };
    window.addEventListener("af:keys-updated", handleUpdate);
    return () => window.removeEventListener("af:keys-updated", handleUpdate);
  }, []);

  useEffect(() => {
    if (open) {
      const c = getStoredUserKeysConfig();
      setConfig(c);
      void runHealthCheck(c);
    }
  }, [open]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = newKey.trim();
    if (!trimmedKey) return;

    setIsValidating(true);
    setFeedback(null);

    try {
      const res = await validateSingleKeyServer({
        data: { apiKey: trimmedKey },
      });

      if (res.ok) {
        const addRes = addUserApiKey(trimmedKey, newName);
        if (addRes.ok) {
          setNewName("");
          setNewKey("");
          setFeedback({
            type: "success",
            message: "Chave validada e adicionada com sucesso!",
          });
          const updated = getStoredUserKeysConfig();
          setConfig(updated);
          void runHealthCheck(updated);
        } else {
          setFeedback({
            type: "error",
            message: addRes.message || "Esta chave já está cadastrada.",
          });
        }
      } else {
        setFeedback({
          type: "error",
          message: res.message || "Chave inválida ou sem créditos.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao testar a chave.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveRename = (id: string) => {
    if (editNameValue.trim()) {
      renameUserApiKey(id, editNameValue.trim());
      setConfig(getStoredUserKeysConfig());
    }
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    removeUserApiKey(id);
    const updated = getStoredUserKeysConfig();
    setConfig(updated);
    void runHealthCheck(updated);
  };

  const handleSelectMode = (mode: "auto" | string) => {
    setSelectedKeyMode(mode);
    const updated = { ...config, selectedKeyId: mode };
    setConfig(updated);
    void runHealthCheck(updated);
  };

  const renderStatusBadge = (status?: KeyHealthDetail["status"] | StoredUserKey["lastStatus"]) => {
    switch (status) {
      case "ok":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Créditos OK
          </span>
        );
      case "sem_creditos":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Sem Créditos (402)
          </span>
        );
      case "limite_temporario":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Limite 429
          </span>
        );
      case "invalida":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/15 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 border border-neutral-500/30">
            Inválida (401)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Verificando...
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 bg-card/95 border-border/80 shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-md shadow-primary/20">
                <Key className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Gerenciador de Chaves de IA
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Escolha qual chave usar ou deixe no modo automático para nunca travar o app.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void runHealthCheck()}
              disabled={isTestingAll}
              className="h-8 rounded-xl px-2.5 text-xs gap-1.5 font-medium border-border/80"
              title="Testar conexão de todas as chaves"
            >
              <RefreshCw className={`size-3.5 ${isTestingAll ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">{isTestingAll ? "Testando..." : "Testar Todas"}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* 1. SELETOR DE MODO: AUTOMÁTICO VS MANUAL */}
        <div className="mt-4 rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5 text-primary" />
              Modo de Operação
            </span>
            <div className="flex items-center rounded-xl bg-background border border-border p-0.5">
              <button
                type="button"
                onClick={() => handleSelectMode("auto")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  config.selectedKeyId === "auto"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Automático (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (config.selectedKeyId === "auto") {
                    const firstKey = config.keys[0]?.id || "server_0";
                    handleSelectMode(firstKey);
                  }
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  config.selectedKeyId !== "auto"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual (Fixar Chave)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {config.selectedKeyId === "auto"
              ? "⚡ Modo Automático: O app tenta suas chaves cadastradas e, se alguma atingir o limite ou esgotar os créditos, pula automaticamente para a próxima sem você precisar fazer nada."
              : "🎯 Modo Manual: O app usará prioritariamente a chave que você selecionou abaixo."}
          </p>
        </div>

        {/* 2. CHAVE PRINCIPAL DO APP (.ENV) */}
        <div className="mt-3 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-blue-500" />
            Chave Principal do Sistema (.env)
          </span>

          {(healthResult?.serverKeys || [{ id: "server_0", name: "Chave Principal do App (.env)", maskedKey: "sk_... (Servidor)", isServer: true, provider: "lovable", status: "sem_creditos" as const, message: "Verificando...", testedAt: "" }]).map((sk) => {
            const isSelected = config.selectedKeyId === sk.id;
            return (
              <div
                key={sk.id}
                onClick={() => config.selectedKeyId !== "auto" && handleSelectMode(sk.id)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  config.selectedKeyId !== "auto"
                    ? isSelected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40 cursor-pointer"
                      : "border-border/80 bg-card hover:border-border cursor-pointer"
                    : "border-border/70 bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {config.selectedKeyId !== "auto" && (
                    <div className={`size-4 rounded-full border flex items-center justify-center ${isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"}`}>
                      {isSelected && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">{sk.name}</p>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold">
                        Servidor
                      </Badge>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {sk.maskedKey}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {renderStatusBadge(sk.status)}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. SUAS CHAVES PERSONALIZADAS (COM APELIDO/RENOMEAÇÃO) */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" />
              Suas Chaves Personalizadas
            </span>
            <span className="text-[11px] text-muted-foreground">
              {config.keys.length} cadastrada{config.keys.length !== 1 ? "s" : ""}
            </span>
          </div>

          {config.keys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-5 text-center bg-muted/10">
              <p className="text-xs font-medium text-foreground">
                Nenhuma chave de IA cadastrada por você ainda.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Adicione uma nova chave abaixo para usar sua própria conta do Lovable ou Google Gemini.
              </p>
            </div>
          ) : (
            config.keys.map((uk) => {
              const isSelected = config.selectedKeyId === uk.id;
              const testedInfo = healthResult?.userKeys?.find((k) => k.id === uk.id);
              const currentStatus = testedInfo?.status || uk.lastStatus || "desconhecido";

              return (
                <div
                  key={uk.id}
                  onClick={() => config.selectedKeyId !== "auto" && handleSelectMode(uk.id)}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl border transition-all ${
                    config.selectedKeyId !== "auto"
                      ? isSelected
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40 cursor-pointer"
                        : "border-border/80 bg-card hover:border-border cursor-pointer"
                      : "border-border/80 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {config.selectedKeyId !== "auto" && (
                      <div className={`size-4 shrink-0 rounded-full border flex items-center justify-center ${isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"}`}>
                        {isSelected && <Check className="size-2.5 stroke-[3]" />}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {editingId === uk.id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="h-7 text-xs font-bold rounded-lg px-2 w-48"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleSaveRename(uk.id)}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleSaveRename(uk.id)}
                          >
                            <Check className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground truncate max-w-[200px]">
                            {uk.name}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(uk.id);
                              setEditNameValue(uk.name);
                            }}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                            title="Renomear chave (ex: Conta Gmail)"
                          >
                            <Edit2 className="size-3" />
                          </button>
                        </div>
                      )}

                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                        {maskKey(uk.key)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t sm:border-0 pt-2 sm:pt-0 border-border/60" onClick={(e) => e.stopPropagation()}>
                    {renderStatusBadge(currentStatus)}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(uk.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Excluir chave"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. ADICIONAR NOVA CHAVE */}
        <form onSubmit={handleAddKey} className="mt-4 rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="size-3.5 text-primary" />
              Adicionar Nova Chave de API
            </span>
            <span className="text-[10px] text-muted-foreground">
              Lovable Gateway ou Google Gemini
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                Nome / Apelido da Chave (Opcional):
              </label>
              <Input
                placeholder="Ex: Conta Gmail do Gustavo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isValidating}
                className="mt-1 text-xs rounded-xl h-9 bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                Código da Chave (API Key):
              </label>
              <Input
                type="password"
                placeholder="sk_... ou AIzaSy..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                disabled={isValidating}
                className="mt-1 font-mono text-xs rounded-xl h-9 bg-background"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground">
              A chave será testada antes de ser salva no seu navegador.
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={isValidating || !newKey.trim()}
              className="rounded-xl h-8 px-3.5 font-bold text-xs gap-1.5 shadow-sm"
            >
              {isValidating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              <span>{isValidating ? "Validando..." : "Testar e Adicionar"}</span>
            </Button>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

