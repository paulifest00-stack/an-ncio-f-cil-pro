import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
      { title: "Anúncio Fácil Pro — Gere anúncios com IA e Supabase" },
      {
        name: "description",
        content:
          "Envie a foto e o nome do produto e receba SKU, título, descrição, palavras-chave, ficha técnica e imagens prontos para copiar.",
      },
      { property: "og:title", content: "Anúncio Fácil Pro — Gere anúncios com IA e Supabase" },
      {
        property: "og:description",
        content:
          "Foto + nome básico viram um anúncio profissional completo, editável e pronto para copiar. Sem inventar informações.",
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
    <main className="min-h-screen bg-background px-4 py-10">
      <header className="mx-auto mb-8 flex w-full max-w-4xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight">
            Anúncio<span className="text-primary"> Fácil Pro</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <RecentListings onSelect={handleSelectSaved} />
          <AiCreditsBadge />
        </div>
      </header>

      {stage === "form" ? <NewProductForm onSubmit={run} /> : null}
      {stage === "processing" ? (
        <Processing error={error} onRetry={() => (input ? run(input) : setStage("form"))} />
      ) : null}
      {stage === "result" && input && listing ? (
        <ProductDashboard input={input} listing={listing} setListing={setListing} onBack={() => setStage("form")} />
      ) : null}
    </main>
  );
}
