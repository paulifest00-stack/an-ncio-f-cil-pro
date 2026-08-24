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
import type { Listing, ProductInput } from "@/lib/ai/types";
import { registerUsage } from "@/lib/usage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anúncio Fácil Pro — Criação Inteligente de Anúncios no Mercado Livre & Bling" },
      {
        name: "description",
        content:
          "Envie a foto e o nome do produto e receba SKU Pai/Filho, título otimizado para o Mercado Livre (60 chars), descrição profissional, ficha técnica e imagem 1:1.",
      },
      { property: "og:title", content: "Anúncio Fácil Pro — Criação Inteligente de Anúncios" },
      {
        property: "og:description",
        content:
          "Foto + nome viram um anúncio profissional completo, editável e pronto para faturar no Mercado Livre e Bling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      const result = await generateListing({ data });
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
    <main className="min-h-screen bg-gradient-to-b from-background via-background/95 to-muted/20 px-4 pb-16 pt-6 sm:px-6">
      {/* Barra de Topo iOS 18 Frosted Glass */}
      <header className="sticky top-4 z-40 mx-auto mb-8 flex w-full max-w-4xl items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 px-4 py-2.5 shadow-lg backdrop-blur-2xl transition-all sm:px-5">
        {/* Marca / Logo */}
        <button
          type="button"
          onClick={() => setStage("form")}
          className="flex items-center gap-2.5 text-left transition-transform active:scale-95"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Anúncio<span className="text-primary font-black"> Fácil</span>
            </span>
            <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
              PRO
            </span>
          </div>
        </button>

        {/* Ações da Direita: Meus Anúncios (Supabase) + Badge de Créditos */}
        <div className="flex items-center gap-2">
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
