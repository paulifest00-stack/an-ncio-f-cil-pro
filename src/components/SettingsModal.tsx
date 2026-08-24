import { useState, useEffect } from "react";
import { Settings, Sparkles, Key, Check, HelpCircle, Eye, EyeOff, Bot, Cpu, ShieldCheck } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AiConfig, AiProvider } from "@/lib/ai/types";

const STORAGE_KEY = "anuncio_facil_ai_config";

export function loadStoredAiConfig(): AiConfig {
  if (typeof window === "undefined") return { provider: "demo" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AiConfig;
  } catch {
    // fallback
  }
  return { provider: "demo" };
}

export function saveStoredAiConfig(config: AiConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface SettingsModalProps {
  onConfigChange?: (config: AiConfig) => void;
}

export function SettingsModal({ onConfigChange }: SettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<AiConfig>({ provider: "demo" });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const saved = loadStoredAiConfig();
    setConfig(saved);
  }, [open]);

  const handleSave = () => {
    saveStoredAiConfig(config);
    onConfigChange?.(config);
    toast.success("Configurações de IA salvas com sucesso!");
    setOpen(false);
  };

  const getProviderInfo = (provider: AiProvider) => {
    switch (provider) {
      case "gemini":
        return {
          name: "Google Gemini",
          desc: "Recomendado. Rápido, com visão computacional de alta qualidade e cota gratuita generosa no Google AI Studio.",
          link: "https://aistudio.google.com/app/apikey",
          linkText: "Obter chave gratuita no Google AI Studio",
          defaultModel: "gemini-2.0-flash",
        };
      case "openai":
        return {
          name: "OpenAI",
          desc: "Modelos GPT-4o e GPT-4o mini com suporte completo a visão.",
          link: "https://platform.openai.com/api-keys",
          linkText: "Obter chave na OpenAI",
          defaultModel: "gpt-4o-mini",
        };
      case "groq":
        return {
          name: "Groq",
          desc: "Inferência ultrarrápida Llama 3.3 70B.",
          link: "https://console.groq.com/keys",
          linkText: "Obter chave no Groq Console",
          defaultModel: "llama-3.3-70b-versatile",
        };
      case "openrouter":
        return {
          name: "OpenRouter",
          desc: "Acesso a múltiplos modelos através de um único saldo.",
          link: "https://openrouter.ai/keys",
          linkText: "Obter chave no OpenRouter",
          defaultModel: "google/gemini-2.0-flash-001",
        };
      case "lovable":
        return {
          name: "Lovable Gateway",
          desc: "Gateway nativo da plataforma Lovable.",
          link: "https://lovable.dev",
          linkText: "Painel Lovable",
          defaultModel: "google/gemini-3.7-flash",
        };
      case "demo":
      default:
        return {
          name: "Modo Demonstração",
          desc: "Geração instantânea e 100% offline. Não consome créditos nem exige nenhuma chave de API.",
          link: null,
          linkText: null,
          defaultModel: "demo-generator",
        };
    }
  };

  const info = getProviderInfo(config.provider);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs font-medium">
          <Settings className="size-3.5" />
          <span>IA: </span>
          <span className="font-semibold text-primary">{info.name}</span>
          {config.provider === "demo" ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              Offline
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">
              Ativo
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Cpu className="size-5 text-primary" />
            Configuração do Provedor de IA
          </DialogTitle>
          <DialogDescription className="text-xs">
            Escolha o modelo e provedor para analisar imagens e gerar anúncios. Você pode usar sua própria chave gratuita ou o modo demonstração.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="provider" className="text-xs font-medium">
              Provedor de Inteligência Artificial
            </Label>
            <Select
              value={config.provider}
              onValueChange={(val: AiProvider) =>
                setConfig((prev) => ({
                  ...prev,
                  provider: val,
                  model: getProviderInfo(val).defaultModel,
                }))
              }
            >
              <SelectTrigger id="provider" className="h-9 text-sm">
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>Modo Demonstração (Grátis / Offline)</span>
                  </div>
                </SelectItem>
                <SelectItem value="gemini">
                  <div className="flex items-center gap-2">
                    <Bot className="size-3.5 text-blue-500" />
                    <span>Google Gemini (Recomendado / Grátis)</span>
                  </div>
                </SelectItem>
                <SelectItem value="openai">
                  <div className="flex items-center gap-2">
                    <Bot className="size-3.5 text-emerald-500" />
                    <span>OpenAI (GPT-4o mini / GPT-4o)</span>
                  </div>
                </SelectItem>
                <SelectItem value="groq">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-3.5 text-orange-500" />
                    <span>Groq (Llama 3.3 70B)</span>
                  </div>
                </SelectItem>
                <SelectItem value="openrouter">
                  <div className="flex items-center gap-2">
                    <Bot className="size-3.5 text-purple-500" />
                    <span>OpenRouter</span>
                  </div>
                </SelectItem>
                <SelectItem value="lovable">
                  <div className="flex items-center gap-2">
                    <Bot className="size-3.5 text-pink-500" />
                    <span>Lovable Gateway</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{info.desc}</p>
          </div>

          {config.provider !== "demo" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="apiKey" className="text-xs font-medium">
                  Chave de API ({info.name})
                </Label>
                {info.link && (
                  <a
                    href={info.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline"
                  >
                    {info.linkText} ↗
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder={
                    config.provider === "gemini"
                      ? "AIzaSy..."
                      : config.provider === "openai"
                      ? "sk-..."
                      : "Sua chave de API"
                  }
                  value={config.apiKey ?? ""}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  className="h-9 pr-9 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3 text-emerald-500" />
                Sua chave fica salva apenas no seu navegador (localStorage).
              </p>
            </div>
          )}

          {config.provider !== "demo" && (
            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs font-medium">
                Modelo (Opcional)
              </Label>
              <Input
                id="model"
                placeholder={info.defaultModel}
                value={config.model ?? ""}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, model: e.target.value }))
                }
                className="h-9 font-mono text-xs"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfig({ provider: "demo" });
              saveStoredAiConfig({ provider: "demo" });
              onConfigChange?.({ provider: "demo" });
              toast.info("Modo demonstração ativado.");
              setOpen(false);
            }}
            className="text-xs"
          >
            Usar Modo Demo
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Check className="size-3.5" />
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
