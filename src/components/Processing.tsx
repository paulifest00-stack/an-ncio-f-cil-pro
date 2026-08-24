import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Search,
    title: "1. Identificação Visual & OCR",
    desc: "Lendo marca, nome, texto na embalagem e proporções...",
  },
  {
    icon: Layers,
    title: "2. Análise de Layout & Proporções",
    desc: "Definindo layout ideal e paleta de cores de acento...",
  },
  {
    icon: ShieldCheck,
    title: "3. Mapeamento de Objeções",
    desc: "Identificando dúvidas reais de compradores para quebrar...",
  },
  {
    icon: Tag,
    title: "4. Regras de SKU (Pai & Variações)",
    desc: "Estruturando SKU Pai e variações de cores/tamanhos...",
  },
  {
    icon: FileText,
    title: "5. Formatação Mercado Livre & Bling",
    desc: "Gerando título oficial até 60 chars e descrição profissional...",
  },
];

export function Processing({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [error]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0 }}
      className="mx-auto w-full max-w-lg"
    >
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        {error ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Não foi possível gerar o anúncio
            </h2>
            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
              {error}
            </p>
            {onRetry && (
              <motion.div whileTap={{ scale: 0.97 }} className="mt-6">
                <Button
                  onClick={onRetry}
                  className="gap-2 rounded-xl bg-primary px-6 text-sm font-semibold"
                >
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </motion.div>
            )}
          </div>
        ) : (
          <div>
            {/* Dynamic Island Pulse Header */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="relative mb-4 flex size-16 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/20 opacity-75" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/30">
                  <Sparkles className="size-7 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Criando Anúncio Inteligente
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Nossa IA multi-etapas está processando seu produto sem inventar dados
              </p>
            </div>

            {/* Steps Timeline iOS Style */}
            <div className="space-y-3">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`flex items-center gap-3.5 rounded-2xl border p-3.5 transition-all ${
                      isCurrent
                        ? "border-primary/40 bg-primary/5 shadow-xs"
                        : isDone
                        ? "border-border/60 bg-muted/20 opacity-80"
                        : "border-transparent bg-transparent opacity-40"
                    }`}
                  >
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isDone
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isCurrent
                          ? "bg-primary text-white shadow-md shadow-primary/25"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? (
                        <Check className="size-4 stroke-[2.5]" />
                      ) : isCurrent ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
