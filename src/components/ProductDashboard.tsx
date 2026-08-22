import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Copy, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyBlock } from "@/components/CopyBlock";
import type { Field, ImageBrief, Listing, ListingSection, ProductInput } from "@/lib/ai/types";
import { NAO_IDENTIFICADO } from "@/lib/ai/types";
import { generateAdImage, regenerateSection } from "@/lib/ai/product.functions";

const SOURCE_LABEL: Record<Field["source"], string> = {
  usuario: "Informado por você",
  imagem: "Identificado na imagem",
  pesquisa: "Encontrado em pesquisa",
  nao_encontrado: "Não encontrado",
};

function keywordsText(listing: Listing) {
  const k = listing.palavrasChave;
  return [
    `Principais: ${k.principais.join(", ") || NAO_IDENTIFICADO}`,
    `Relacionadas: ${k.relacionadas.join(", ") || NAO_IDENTIFICADO}`,
    `Variações de busca: ${k.variacoes.join(", ") || NAO_IDENTIFICADO}`,
  ].join("\n");
}

function fichaText(listing: Listing) {
  return Object.entries(listing.fichaTecnica)
    .map(([k, v]) => `${k}: ${v.value}`)
    .join("\n");
}

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? <Check /> : <Copy />}
      {ok ? "Copiado" : "Copiar"}
    </Button>
  );
}

export function ProductDashboard({
  input,
  listing,
  setListing,
  onBack,
}: {
  input: ProductInput;
  listing: Listing;
  setListing: (l: Listing) => void;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState<ListingSection | null>(null);
  const [imageState, setImageState] = useState<Record<number, { loading: boolean; url?: string; error?: string }>>({});
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<Listing>) => setListing({ ...listing, ...p });

  const regen = async (section: ListingSection) => {
    setBusy(section);
    setError(null);
    try {
      const result = await regenerateSection({ data: { section, input, listing } });
      patch(result as Partial<Listing>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao regenerar.");
    } finally {
      setBusy(null);
    }
  };

  const renderImage = async (index: number, brief: ImageBrief) => {
    setImageState((s) => ({ ...s, [index]: { loading: true } }));
    try {
      const url = await generateAdImage({ data: { prompt: brief.prompt, photoDataUrl: input.photoDataUrl } });
      setImageState((s) => ({ ...s, [index]: { loading: false, url } }));
    } catch (e) {
      setImageState((s) => ({
        ...s,
        [index]: { loading: false, error: e instanceof Error ? e.message : "Falha ao gerar imagem." },
      }));
    }
  };

  const anuncioCompleto = [
    `SKU: ${listing.sku}`,
    `Nome interno (Bling): ${listing.nomeInterno}`,
    `Título Mercado Livre: ${listing.tituloMercadoLivre}`,
    "",
    "Descrição:",
    listing.descricao,
    "",
    "Palavras-chave:",
    keywordsText(listing),
    "",
    "Ficha técnica:",
    fichaText(listing),
  ].join("\n");

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <img
            src={input.photoDataUrl}
            alt={listing.nomeInterno}
            className="size-16 rounded-lg border border-border object-cover"
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{listing.nomeInterno || input.basicName}</h1>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{listing.sku}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft />
          Novo produto
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Tabs defaultValue="resumo">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="sku">SKU</TabsTrigger>
          <TabsTrigger value="ml">Mercado Livre</TabsTrigger>
          <TabsTrigger value="descricao">Descrição</TabsTrigger>
          <TabsTrigger value="palavras">Palavras-chave</TabsTrigger>
          <TabsTrigger value="ficha">Ficha Técnica</TabsTrigger>
          <TabsTrigger value="imagens">Imagens</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4">
          {listing.alertas.length ? (
            <div className="rounded-xl border border-border bg-accent/40 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="size-4" />
                Precisa de confirmação
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {listing.alertas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {listing.resumo ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
              {listing.resumo}
            </div>
          ) : null}

          {listing.caracteristicas.length ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">Características confirmadas</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {listing.caracteristicas.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </ul>
            </div>
          ) : null}

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Anúncio completo</h3>
              <CopyButton text={anuncioCompleto} />
            </header>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-relaxed">
              {anuncioCompleto}
            </pre>
          </section>
        </TabsContent>

        <TabsContent value="sku" className="space-y-4">
          <CopyBlock
            label="SKU"
            hint="Curto, único e montado apenas com dados confirmados."
            value={listing.sku}
            onChange={(v) => patch({ sku: v })}
            onRegenerate={() => regen("sku")}
            regenerating={busy === "sku"}
          />
          <CopyBlock
            label="Nome interno (Bling)"
            hint="Identificação rápida, sem SEO."
            value={listing.nomeInterno}
            onChange={(v) => patch({ nomeInterno: v })}
            onRegenerate={() => regen("nomeInterno")}
            regenerating={busy === "nomeInterno"}
          />
        </TabsContent>

        <TabsContent value="ml">
          <CopyBlock
            label="Título Mercado Livre"
            hint={`${listing.tituloMercadoLivre.length} caracteres`}
            value={listing.tituloMercadoLivre}
            onChange={(v) => patch({ tituloMercadoLivre: v })}
            onRegenerate={() => regen("tituloMercadoLivre")}
            regenerating={busy === "tituloMercadoLivre"}
          />
        </TabsContent>

        <TabsContent value="descricao">
          <CopyBlock
            label="Descrição"
            multiline
            rows={22}
            value={listing.descricao}
            onChange={(v) => patch({ descricao: v })}
            onRegenerate={() => regen("descricao")}
            regenerating={busy === "descricao"}
          />
        </TabsContent>

        <TabsContent value="palavras" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => regen("palavrasChave")} disabled={busy === "palavrasChave"}>
              <RefreshCw className={busy === "palavrasChave" ? "animate-spin" : ""} />
              Regenerar palavras-chave
            </Button>
          </div>
          {(
            [
              ["principais", "Principais"],
              ["relacionadas", "Relacionadas"],
              ["variacoes", "Variações de busca"],
            ] as const
          ).map(([key, label]) => (
            <CopyBlock
              key={key}
              label={label}
              multiline
              rows={3}
              hint="Uma por linha ou separadas por vírgula."
              value={listing.palavrasChave[key].join(", ")}
              onChange={(v) =>
                patch({
                  palavrasChave: {
                    ...listing.palavrasChave,
                    [key]: v
                      .split(/[,\n]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          ))}
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Todas as palavras-chave</h3>
              <CopyButton text={keywordsText(listing)} />
            </header>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{keywordsText(listing)}</pre>
          </section>
        </TabsContent>

        <TabsContent value="ficha" className="space-y-4">
          <div className="flex justify-end">
            <div className="flex gap-2">
              <CopyButton text={fichaText(listing)} />
              <Button variant="outline" size="sm" onClick={() => regen("fichaTecnica")} disabled={busy === "fichaTecnica"}>
                <RefreshCw className={busy === "fichaTecnica" ? "animate-spin" : ""} />
                Regenerar
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {Object.entries(listing.fichaTecnica).map(([campo, field]) => (
              <div key={campo} className="grid grid-cols-1 gap-2 border-b border-border p-3 last:border-b-0 sm:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-sm font-medium">{campo}</p>
                  <p className="text-[11px] text-muted-foreground">{SOURCE_LABEL[field.source]}</p>
                </div>
                <div>
                  <Input
                    value={field.value}
                    onChange={(e) =>
                      patch({
                        fichaTecnica: {
                          ...listing.fichaTecnica,
                          [campo]: {
                            ...field,
                            value: e.target.value,
                            source: e.target.value === field.value ? field.source : "usuario",
                          },
                        },
                      })
                    }
                    className={field.source === "nao_encontrado" ? "text-muted-foreground" : ""}
                  />
                  {field.note ? <p className="mt-1 text-xs text-muted-foreground">{field.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="imagens" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => regen("imagens")} disabled={busy === "imagens"}>
              <RefreshCw className={busy === "imagens" ? "animate-spin" : ""} />
              Regenerar briefings
            </Button>
          </div>
          {listing.imagens.map((brief, i) => {
            const state = imageState[i];
            return (
              <section key={`${brief.tipo}-${i}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{brief.titulo || brief.tipo}</h3>
                    {brief.observacoes ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{brief.observacoes}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <CopyButton text={brief.prompt} />
                    <Button size="sm" onClick={() => renderImage(i, brief)} disabled={state?.loading}>
                      {state?.loading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                      {state?.url ? "Gerar novamente" : "Gerar imagem"}
                    </Button>
                  </div>
                </header>
                <Textarea
                  rows={4}
                  value={brief.prompt}
                  onChange={(e) => {
                    const imagens = [...listing.imagens];
                    imagens[i] = { ...brief, prompt: e.target.value };
                    patch({ imagens });
                  }}
                />
                {state?.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
                {state?.url ? (
                  <div className="mt-3">
                    <img src={state.url} alt={brief.titulo} className="w-full rounded-lg border border-border" />
                    <a
                      href={state.url}
                      download={`${listing.sku || "produto"}-${brief.tipo}.png`}
                      className="mt-2 inline-block text-xs font-medium text-primary underline"
                    >
                      Baixar imagem
                    </a>
                  </div>
                ) : null}
              </section>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
