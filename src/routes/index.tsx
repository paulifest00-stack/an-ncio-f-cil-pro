import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import { RecentListings, saveProductToHistory } from "@/components/RecentListings";
import { NewProductForm } from "@/components/NewProductForm";
import { Processing } from "@/components/Processing";
import { ProductDashboard } from "@/components/ProductDashboard";
import { generateListing } from "@/lib/ai/product.functions";
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

type Stage = "form" | "processing" | "result";

function Index() {
  const [stage, setStage] = useState<Stage>("form");
  const [input, setInput] = useState<ProductInput | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-background via-background/95 to-muted/20 px-2 sm:px-6 pb-16 pt-2 sm:pt-6">
      {/* Barra de Topo iOS 18 Frosted Glass */}
      <header className="sticky top-2 sm:top-4 z-40 mx-auto mb-4 sm:mb-8 flex w-full max-w-4xl items-center justify-between gap-1.5 sm:gap-2 rounded-2xl border border-border/70 bg-card/85 px-2.5 py-1.5 sm:px-5 sm:py-2.5 shadow-lg backdrop-blur-2xl transition-all">
        {/* Marca / Logo MARKET AI */}
        <button
          type="button"
          onClick={() => setStage("form")}
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


      {/* Conteúdo Principal com Transição Fluida iOS */}
      <div className="mx-auto w-full max-w-4xl">
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
                onBack={() => setStage("form")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
