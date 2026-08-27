import { useEffect, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, ExternalLink, Key, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import { RecentListings, saveProductToHistory } from "@/components/RecentListings";
import { NewProductForm } from "@/components/NewProductForm";
import { Processing } from "@/components/Processing";
import { ProductDashboard } from "@/components/ProductDashboard";
import { generateListing } from "@/lib/ai/product.functions";
import { revealLovableKeyServer } from "@/lib/ai/credits.functions";
import { getUserApiKeys } from "@/lib/ai/user-keys";
import type { Listing, ProductInput } from "@/lib/ai/types";
import { registerUsage } from "@/lib/usage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MARKET AI — Gerador de Anúncios & Catálogo PRO (Mercado Livre & Bling)" },
      {
        name: "description",
        content:
          "MARKET AI: Envie a foto e o nome do produto e receba SKU Pai/Filho, título otimizado para o Mercado Livre (60 chars), descrição profissional, ficha técnica oficial NCM e imagem 1:1.",
      },
      { property: "og:title", content: "MARKET AI — Criação Inteligente de Anúncios para Marketplace" },
      {
        property: "og:description",
        content:
          "Foto + nome viram um anúncio profissional completo, editável e pronto para faturar no Mercado Livre e Bling.",
      },
      { property: "og:image", content: "/logo-market-ai.jpg" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/logo-market-ai.jpg" },
    ],
  }),

  component: Index,
});

function TemporaryKeyBanner() {
  const [keyInfo, setKeyInfo] = useState<{ key: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchKey = async () => {
    setLoading(true);
    try {
      const res = await revealLovableKeyServer();
      setKeyInfo(res);
    } catch {
      try {
        const r = await fetch("/api/key");
        const json = await r.json();
        setKeyInfo({ key: json.key });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchKey();
  }, []);

  return (
    <div className="mx-auto mb-4 w-full max-w-4xl lg:max-w-6xl rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Key className="size-4 text-amber-600 shrink-0" />
        <span className="leading-tight">
          <strong>Captura de Chave:</strong>{" "}
          <code className="font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border">
            {keyInfo?.key
              ? `${keyInfo.key.slice(0, 8)}...${keyInfo.key.slice(-6)}`
              : loading
              ? "Buscando chave..."
              : "Verifique em /api/key"}
          </code>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {keyInfo?.key && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 bg-background shadow-xs font-semibold"
            onClick={() => {
              void navigator.clipboard.writeText(keyInfo.key!);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            {copied ? "Copiada!" : "Copiar Chave"}
          </Button>
        )}
        <a
          href="/api/key"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
        >
          <span>Abrir /api/key</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

type Stage = "form" | "processing" | "result";

function Index() {
  const [stage, setStage] = useState<Stage>(() => {
    if (typeof window === "undefined") return "form";
    try {
      const saved = sessionStorage.getItem("market_ai_active_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.listing && parsed.input) return "result";
      }
    } catch {}
    return "form";
  });

  const [input, setInput] = useState<ProductInput | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem("market_ai_active_state");
      if (saved) return JSON.parse(saved).input;
    } catch {}
    return null;
  });

  const [listing, setListing] = useState<Listing | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem("market_ai_active_state");
      if (saved) return JSON.parse(saved).listing;
    } catch {}
    return null;
  });

  const [error, setError] = useState<string | null>(null);

  // Sincroniza estado ativo com sessionStorage para restauração em 0ms
  useEffect(() => {
    try {
      if (stage === "result" && listing && input) {
        sessionStorage.setItem("market_ai_active_state", JSON.stringify({ listing, input }));
      } else if (stage === "form") {
        sessionStorage.removeItem("market_ai_active_state");
      }
    } catch {}
  }, [stage, listing, input]);

  const run = async (data: ProductInput) => {
    setInput(data);
    setStage("processing");
    setError(null);
    try {
      const result = await generateListing({
        data: {
          data,
          customKeys: getUserApiKeys(),
        },
      });
      registerUsage("texto");
      const generated = result as Listing;
      setListing(generated);
      // Salva no histórico local e no Supabase Cloud automaticamente
      saveProductToHistory(data, generated);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o anúncio.");
    }
  };

  const handleSelectSaved = (saved: { input: ProductInput; listing: Listing }) => {
    setInput(saved.input);
    setListing(saved.listing);
    setStage("result");
  };

  const handleNew = () => {
    try {
      sessionStorage.removeItem("market_ai_active_state");
      sessionStorage.removeItem("market_ai_form_draft");
    } catch {}
    setInput(null);
    setListing(null);
    setStage("form");
  };


  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-background via-background/95 to-muted/20 px-2 sm:px-6 pb-16 pt-2 sm:pt-6">
      {/* Barra de Topo iOS 18 Frosted Glass */}
      <header className="sticky top-2 sm:top-4 z-40 mx-auto mb-4 sm:mb-8 flex w-full max-w-4xl lg:max-w-6xl items-center justify-between gap-1.5 sm:gap-2 rounded-2xl border border-border/70 bg-card/85 px-2.5 py-1.5 sm:px-5 sm:py-2.5 shadow-lg backdrop-blur-2xl transition-all">
        {/* Marca / Logo MARKET AI */}
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-2 sm:gap-2.5 text-left transition-transform active:scale-95 shrink-0 group min-w-0"
        >

          <img
            src="/logo-market-ai.jpg"
            alt="MARKET AI"
            className="size-7 sm:size-9 rounded-xl shadow-xs border border-border/80 object-cover bg-white shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-black tracking-tight text-foreground whitespace-nowrap">
                MARKET <span className="text-[#F5A623]">AI</span>
              </span>
              <span className="rounded-md bg-[#F5A623]/15 px-1 py-0.2 text-[9px] sm:text-[10px] font-black text-[#D97706] dark:text-[#FBBF24]">
                PRO
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground font-medium hidden sm:block">
              Anúncio Fácil Mercado Livre & Bling
            </span>
          </div>
        </button>

        {/* Ações da Direita: Meus Anúncios (Supabase) + Badge de Créditos */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <RecentListings onSelect={handleSelectSaved} />
          <AiCreditsBadge />
        </div>
      </header>

      {/* Banner Temporário para captura de chave no Lovable */}
      <TemporaryKeyBanner />

      {/* Conteúdo Principal com Transição Fluida iOS */}
      <div className="mx-auto w-full max-w-4xl lg:max-w-6xl">

        <AnimatePresence mode="wait">
          {stage === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            >
              <NewProductForm onSubmit={run} />
            </motion.div>
          )}

          {stage === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            >
              <Processing
                error={error}
                onRetry={() => (input ? run(input) : setStage("form"))}
              />
            </motion.div>
          )}

          {stage === "result" && input && listing && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            >
              <ProductDashboard
                input={input}
                listing={listing}
                setListing={setListing}
                onBack={handleNew}
              />

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
