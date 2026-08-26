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
import {
  getUserApiKeys,
  addUserApiKey,
  removeUserApiKey,
  maskKey,
} from "@/lib/ai/user-keys";
import { validateSingleKeyServer } from "@/lib/ai/credits.functions";

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

  const [keys, setKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const reloadKeys = () => {
    setKeys(getUserApiKeys());
  };

  useEffect(() => {
    reloadKeys();
    window.addEventListener("af:keys-updated", reloadKeys);
    return () => window.removeEventListener("af:keys-updated", reloadKeys);
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKey.trim();
    if (!trimmed) return;

    setIsValidating(true);
    setFeedback(null);

    try {
      const res = await validateSingleKeyServer({
        data: { apiKey: trimmed },
      });

      if (res.ok) {
        const added = addUserApiKey(trimmed);
        if (added) {
          setNewKey("");
          setFeedback({
            type: "success",
            message: "Chave validada e adicionada com sucesso ao pool de fallback!",
          });
        } else {
          setFeedback({
            type: "error",
            message: "Esta chave já está cadastrada no seu navegador.",
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

  const handleRemove = (keyToRemove: string) => {
    removeUserApiKey(keyToRemove);
    setFeedback({
      type: "success",
      message: "Chave removida.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card border-border/80 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Chaves de API de IA
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Insira suas próprias chaves de API (Lovable Gateway ou Google Gemini). O app utiliza
            fallback automático entre todas as chaves cadastradas.
          </DialogDescription>
        </DialogHeader>

        {/* Formulário para adicionar nova chave */}
        <form onSubmit={handleAddKey} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Adicionar Nova Chave</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Lovable / Google Gemini
              </span>
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk_... ou AIzaSy..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                disabled={isValidating}
                className="font-mono text-xs rounded-xl h-9"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isValidating || !newKey.trim()}
                className="rounded-xl h-9 px-3 shrink-0 gap-1.5 font-medium"
              >
                {isValidating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                <span>{isValidating ? "Testando..." : "Salvar"}</span>
              </Button>
            </div>
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

        {/* Lista de Chaves Ativas */}
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" />
              Chaves no Pool de Fallback
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {keys.length + 1} ativa{keys.length + 1 > 1 ? "s" : ""}
            </span>
          </div>

          {/* Chave Padrão do Servidor */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/40 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Chave do Servidor (.env)</p>
                <p className="text-[10px] text-muted-foreground">Configurada no servidor</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Online
            </span>
          </div>

          {/* Chaves adicionadas pelo usuário */}
          {keys.map((k, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card text-xs group hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <div>
                  <p className="font-mono text-xs text-foreground">{maskKey(k)}</p>
                  <p className="text-[10px] text-muted-foreground">Chave do Navegador</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(k)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                title="Remover chave"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
