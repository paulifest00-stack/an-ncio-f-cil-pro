import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe,
  ImageIcon,
  Layers,
  Loader2,
  Palette,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyBlock } from "@/components/CopyBlock";
import type {
  Field,
  ImageBrief,
  Listing,
  ListingSection,
  ProductInput,
  Referencia,
} from "@/lib/ai/types";
import { NAO_IDENTIFICADO } from "@/lib/ai/types";
import {
  generateAdImage,
  regenerateSection,
} from "@/lib/ai/product.functions";
import { registerUsage } from "@/lib/usage";

const SOURCE_LABEL: Record<Field["source"], string> = {
  usuario: "Informado por você",
  imagem: "Identificado na embalagem",
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

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 text-xs font-medium"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {ok ? "Copiado!" : label}
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
  const [imageState, setImageState] = useState<
    Record<number, { loading: boolean; url?: string; error?: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<Listing>) => setListing({ ...listing, ...p });

  const regen = async (section: ListingSection) => {
    setBusy(section);
    setError(null);
    try {
      const result = await regenerateSection({
        data: { section, input, listing },
      });
      registerUsage("texto");
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
      const url = await generateAdImage({
        data: { prompt: brief.prompt, photoDataUrl: input.photoDataUrl },
      });
      registerUsage("imagem");
      setImageState((s) => ({ ...s, [index]: { loading: false, url } }));
    } catch (e) {
      setImageState((s) => ({
        ...s,
        [index]: {
          loading: false,
          error: e instanceof Error ? e.message : "Falha ao gerar imagem.",
        },
      }));
    }
  };

  const id = listing.identificacao;
  const objImg = listing.imagens.find((i) => i.tipo === "objecoes");
  const plano = objImg?.plano;

  const anuncioCompleto = [
    `SKU: ${listing.sku}`,
    listing.skuPai ? `SKU Pai: ${listing.skuPai}` : "",
    listing.skuFilho ? `SKU Filho: ${listing.skuFilho}` : "",
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
  ]
    .filter(Boolean)
    .join("\n");

  const titleLength = listing.tituloMercadoLivre.length;
  const isTitleOptimal = titleLength > 0 && titleLength <= 60;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header do Produto */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={input.photoDataUrl}
              alt={listing.nomeInterno}
              className="size-20 rounded-xl border border-border object-cover shadow-xs"
            />
            {id?.corAcento ? (
              <span
                className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background shadow-xs"
                style={{ backgroundColor: id.corAcento }}
                title={`Cor de acento: ${id.corAcento}`}
              />
            ) : null}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {listing.nomeInterno || input.basicName}
              </h1>
              {id?.layout ? (
                <Badge variant="outline" className="text-xs font-semibold uppercase">
                  Layout {id.layout}
                </Badge>
              ) : null}
              {id?.certeza ? (
                <Badge
                  variant={id.certeza === "alta" ? "secondary" : "outline"}
                  className="text-xs capitalize"
                >
                  Certeza: {id.certeza}
                </Badge>
              ) : null}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                <Tag className="size-3.5 text-primary" />
                {listing.sku || "SEM SKU"}
              </span>
              {id?.marca ? <span>Marca: <strong className="text-foreground">{id.marca}</strong></span> : null}
              {id?.volume ? <span>Volume/Qtd: <strong className="text-foreground">{id.volume}</strong></span> : null}
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Novo produto
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Tabs defaultValue="resumo">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/60 p-1.5">
          <TabsTrigger value="resumo" className="rounded-lg text-xs font-medium">Resumo</TabsTrigger>
          <TabsTrigger value="sku" className="rounded-lg text-xs font-medium">SKU (Pai & Filho)</TabsTrigger>
          <TabsTrigger value="ml" className="rounded-lg text-xs font-medium">Mercado Livre</TabsTrigger>
          <TabsTrigger value="descricao" className="rounded-lg text-xs font-medium">Descrição</TabsTrigger>
          <TabsTrigger value="palavras" className="rounded-lg text-xs font-medium">Palavras-chave</TabsTrigger>
          <TabsTrigger value="ficha" className="rounded-lg text-xs font-medium">Ficha Técnica</TabsTrigger>
          <TabsTrigger value="imagens" className="rounded-lg text-xs font-medium">Imagens & Layout (1:1)</TabsTrigger>
          <TabsTrigger value="referencias" className="rounded-lg text-xs font-medium">
            Referências na Web
            {listing.referencias?.length ? (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {listing.referencias.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RESUMO */}
        <TabsContent value="resumo" className="space-y-4 pt-2">
          {listing.alertas.length ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-4 text-amber-600" />
                Pontos de Atenção e Confirmação
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-200">
                {listing.alertas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Destaque de Referências Rápidas na Web */}
          {listing.referencias && listing.referencias.length > 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Search className="size-4 text-primary" />
                  Pesquisa e Anúncios Reais do Produto
                </h3>
                <span className="text-xs text-muted-foreground">Clique para abrir anúncios de referência</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.referencias.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-accent"
                  >
                    {ref.tipo === "oficial" ? (
                      <Globe className="size-3.5 text-blue-600" />
                    ) : (
                      <ShoppingBag className="size-3.5 text-amber-600" />
                    )}
                    {ref.titulo}
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {listing.resumo ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground shadow-sm">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-foreground">
                Diagnóstico da IA
              </h3>
              {listing.resumo}
            </div>
          ) : null}

          {listing.caracteristicas.length ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Características Confirmadas
              </h3>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {listing.caracteristicas.map((c) => (
                  <Badge key={c} variant="secondary" className="px-2.5 py-1 text-xs">
                    {c}
                  </Badge>
                ))}
              </ul>
            </div>
          ) : null}

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Anúncio Completo</h3>
                <p className="text-xs text-muted-foreground">Cópia unificada para colar onde desejar</p>
              </div>
              <CopyButton text={anuncioCompleto} label="Copiar Tudo" />
            </header>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-4 font-mono text-xs leading-relaxed text-foreground">
              {anuncioCompleto}
            </pre>
          </section>
        </TabsContent>

        {/* TAB 2: SKU (PAI & FILHO) */}
        <TabsContent value="sku" className="space-y-4 pt-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
            <h4 className="font-semibold text-foreground">Padrão de Formatação de SKU</h4>
            <p className="mt-1 font-mono">
              [MARCA][CATEGORIA/PRODUTO][ESPECIFICACAO_FIXA][QTD_BASE] - [VARIACAO]
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CopyBlock
              label="SKU Principal"
              hint="Código único do produto ativo"
              value={listing.sku}
              onChange={(v) => patch({ sku: v })}
              onRegenerate={() => regen("sku")}
              regenerating={busy === "sku"}
            />
            <CopyBlock
              label="Nome Interno (Bling)"
              hint="Identificação rápida para cadastro sem SEO"
              value={listing.nomeInterno}
              onChange={(v) => patch({ nomeInterno: v })}
              onRegenerate={() => regen("nomeInterno")}
              regenerating={busy === "nomeInterno"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU Pai (Base Aglutinada)
                </span>
                <CopyButton text={listing.skuPai || listing.sku} />
              </div>
              <p className="mt-2 font-mono text-lg font-bold text-foreground">
                {listing.skuPai || listing.sku}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Identifica a família do produto sem a variação final (8 a 16 caracteres).
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU Filho (Com Variação)
                </span>
                <CopyButton text={listing.skuFilho || listing.sku} />
              </div>
              <p className="mt-2 font-mono text-lg font-bold text-primary">
                {listing.skuFilho || listing.sku}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Herda o SKU Pai com o sufixo de variação após hífen (-) (10 a 20 caracteres).
              </p>
            </div>
          </div>

          {/* Lista de Variações de SKU Geradas */}
          {listing.variacoesSku && listing.variacoesSku.length > 0 ? (
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">
                Variações Mapeadas & SKUs Filhos
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {listing.variacoesSku.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 p-2.5"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{v.variacao}</p>
                      <p className="font-mono text-xs font-bold text-primary">{v.sku}</p>
                    </div>
                    <CopyButton text={v.sku} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </TabsContent>

        {/* TAB 3: MERCADO LIVRE */}
        <TabsContent value="ml" className="space-y-4 pt-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Título Otimizado para o Mercado Livre</h3>
                <p className="text-xs text-muted-foreground">
                  Focado em alta conversão e buscas orgânicas
                </p>
              </div>
              <Badge
                variant={isTitleOptimal ? "secondary" : "destructive"}
                className="font-mono text-xs"
              >
                {titleLength} / 60 caracteres
              </Badge>
            </div>

            <div className="mt-3">
              <Input
                value={listing.tituloMercadoLivre}
                onChange={(e) => patch({ tituloMercadoLivre: e.target.value })}
                className="font-medium text-foreground"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Dica: O Mercado Livre recomenda títulos concisos até 60 caracteres sem pontuação excessiva.
              </span>
              <div className="flex gap-2">
                <CopyButton text={listing.tituloMercadoLivre} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regen("tituloMercadoLivre")}
                  disabled={busy === "tituloMercadoLivre"}
                >
                  <RefreshCw
                    className={`size-3.5 ${busy === "tituloMercadoLivre" ? "animate-spin" : ""}`}
                  />
                  Regenerar Título
                </Button>
              </div>
            </div>
          </section>

          {/* Mock visual do Anúncio no Mercado Livre */}
          <div className="rounded-xl border border-amber-300/40 bg-amber-500/5 p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Prévia do Card de Busca no Mercado Livre
            </span>
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-xs">
              <img
                src={input.photoDataUrl}
                alt="Prévia"
                className="size-16 rounded object-contain bg-white p-1"
              />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground line-clamp-2">
                  {listing.tituloMercadoLivre || "Título do anúncio..."}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">R$ --,--</span>
                  <Badge className="bg-emerald-600 text-[10px] text-white">Frete Grátis</Badge>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: DESCRIÇÃO */}
        <TabsContent value="descricao" className="pt-2">
          <CopyBlock
            label="Descrição Comercial do Anúncio"
            multiline
            rows={22}
            hint="Estruturada em seções profissionais: Apresentação, Destaques, Ficha Técnica, Conteúdo, Modo de Uso e FAQ."
            value={listing.descricao}
            onChange={(v) => patch({ descricao: v })}
            onRegenerate={() => regen("descricao")}
            regenerating={busy === "descricao"}
          />
        </TabsContent>

        {/* TAB 5: PALAVRAS-CHAVE */}
        <TabsContent value="palavras" className="space-y-4 pt-2">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => regen("palavrasChave")}
              disabled={busy === "palavrasChave"}
            >
              <RefreshCw className={`size-3.5 ${busy === "palavrasChave" ? "animate-spin" : ""}`} />
              Regenerar Palavras-chave
            </Button>
          </div>
          {(
            [
              ["principais", "Palavras-chave Principais"],
              ["relacionadas", "Palavras-chave Relacionadas"],
              ["variacoes", "Variações e Termos de Busca"],
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
              <h3 className="text-sm font-semibold">Todas as Palavras-chave</h3>
              <CopyButton text={keywordsText(listing)} />
            </header>
            <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
              {keywordsText(listing)}
            </pre>
          </section>
        </TabsContent>

        {/* TAB 6: FICHA TÉCNICA */}
        <TabsContent value="ficha" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Campos essenciais para indexação no Mercado Livre e Bling
            </p>
            <div className="flex gap-2">
              <CopyButton text={fichaText(listing)} label="Copiar Ficha" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => regen("fichaTecnica")}
                disabled={busy === "fichaTecnica"}
              >
                <RefreshCw className={`size-3.5 ${busy === "fichaTecnica" ? "animate-spin" : ""}`} />
                Regenerar Ficha
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {Object.entries(listing.fichaTecnica).map(([campo, field]) => (
              <div
                key={campo}
                className="grid grid-cols-1 gap-2 border-b border-border p-3.5 last:border-b-0 sm:grid-cols-[180px_1fr]"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{campo}</p>
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
                  {field.note ? (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{field.note}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 7: IMAGENS & LAYOUT (1:1) */}
        <TabsContent value="imagens" className="space-y-5 pt-2">
          {/* Card com Detalhes do Plano de Layout e Objeções */}
          {plano ? (
            <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Plano da Imagem de Objeções (Infográfico)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Layout {plano.layout} (Proporção {plano.proporcao.toFixed(2)})
                  </Badge>
                  <span
                    className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: plano.corAcento }}
                  >
                    <Palette className="size-3" />
                    {plano.corAcento}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Título em 3 Linhas
                  </span>
                  <div className="mt-1 space-y-0.5 text-xs font-medium">
                    <p className="text-muted-foreground">1. {plano.titulo.linha1}</p>
                    <p className="text-sm font-bold" style={{ color: plano.corAcento }}>
                      2. {plano.titulo.linha2}
                    </p>
                    <p className="font-semibold text-foreground">3. {plano.titulo.linha3}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pontos de Quebra de Objeção ({plano.pontos.length} pontos)
                  </span>
                  <ul className="mt-1 space-y-1 text-xs">
                    {plano.pontos.map((p, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: plano.corAcento }} />
                        <span className="font-semibold text-foreground">{p.texto}</span>
                        <span className="text-[10px] text-muted-foreground">({p.fonte})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Todas as imagens são obrigatoriamente geradas no formato quadrado 1:1.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => regen("imagens")}
              disabled={busy === "imagens"}
            >
              <RefreshCw className={`size-3.5 ${busy === "imagens" ? "animate-spin" : ""}`} />
              Regenerar Briefings
            </Button>
          </div>

          {listing.imagens.map((brief, i) => {
            const state = imageState[i];
            return (
              <section
                key={`${brief.tipo}-${i}`}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {brief.titulo || brief.tipo}
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        1:1 Square
                      </Badge>
                    </div>
                    {brief.observacoes ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{brief.observacoes}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <CopyButton text={brief.prompt} label="Copiar Prompt" />
                    <Button
                      size="sm"
                      onClick={() => renderImage(i, brief)}
                      disabled={state?.loading}
                      className="gap-1.5"
                    >
                      {state?.loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="size-3.5" />
                      )}
                      {state?.url ? "Gerar Novamente" : "Gerar Imagem"}
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
                  className="font-mono text-xs"
                />

                {state?.error ? (
                  <p className="mt-2 text-sm text-destructive">{state.error}</p>
                ) : null}

                {state?.url ? (
                  <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                    <img
                      src={state.url}
                      alt={brief.titulo}
                      className="aspect-square w-full max-w-sm rounded-lg border border-border object-cover shadow-xs"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <a
                        href={state.url}
                        download={`${listing.sku || "produto"}-${brief.tipo}.png`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        Baixar imagem PNG 1:1
                      </a>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </TabsContent>

        {/* TAB 8: REFERÊNCIAS NA WEB */}
        <TabsContent value="referencias" className="space-y-4 pt-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Pesquisas Reais e Anúncios na Internet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Utilize estes links para conferir anúncios existentes do produto, consultar descrições oficiais, baixar fotos adicionais e se inspirar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {listing.referencias?.map((ref, idx) => (
              <a
                key={idx}
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                      {ref.tipo === "oficial" ? (
                        <Globe className="size-4" />
                      ) : (
                        <ShoppingBag className="size-4" />
                      )}
                      {ref.tipo}
                    </span>
                    <ExternalLink className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-foreground group-hover:text-primary">
                    {ref.titulo}
                  </h4>
                  {ref.observacao ? (
                    <p className="mt-1 text-xs text-muted-foreground">{ref.observacao}</p>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px] font-medium text-primary">
                  <span>Abrir no navegador</span>
                  <span>↗</span>
                </div>
              </a>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
