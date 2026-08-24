import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Loader2,
  Package,
  Palette,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyBlock } from "@/components/CopyBlock";
import type {
  Field,
  ImageBrief,
  Listing,
  ListingSection,
  ProductInput,
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
  nao_encontrado: "Não identificado",
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

function CopyButton({
  text,
  label = "Copiar",
  variant = "secondary",
  className = "",
}: {
  text: string;
  label?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  className?: string;
}) {
  const [ok, setOk] = useState(false);
  return (
    <motion.div whileTap={{ scale: 0.95 }}>
      <Button
        size="sm"
        variant={ok ? "default" : variant}
        className={`h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all ${
          ok ? "bg-emerald-600 text-white" : ""
        } ${className}`}
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        }}
      >
        {ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        <span>{ok ? "Copiado!" : label}</span>
      </Button>
    </motion.div>
  );
}

const TABS = [
  { id: "resumo", label: "Visão Geral", icon: Package },
  { id: "ml", label: "Mercado Livre", icon: ShoppingCart },
  { id: "sku", label: "SKU Pai & Filho", icon: Tag },
  { id: "descricao", label: "Descrição & Ficha", icon: FileText },
  { id: "imagens", label: "Imagens 1:1 & Layout", icon: ImageIcon },
  { id: "referencias", label: "Referências Web", icon: Globe },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
  const [activeTab, setActiveTab] = useState<TabId>("resumo");
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0 }}
      className="mx-auto w-full max-w-4xl space-y-6"
    >
      {/* 1. Header do Produto Estilo iOS Frosted Card */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xl backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Foto do Produto com Badge de Cor de Acento */}
            <div className="relative shrink-0">
              <img
                src={input.photoDataUrl}
                alt={listing.nomeInterno}
                className="size-18 rounded-2xl border border-border/80 object-cover shadow-md"
              />
              {id?.corAcento ? (
                <span
                  className="absolute -bottom-1.5 -right-1.5 size-5 rounded-full border-2 border-card shadow-sm"
                  style={{ backgroundColor: id.corAcento }}
                  title={`Cor de acento da embalagem: ${id.corAcento}`}
                />
              ) : null}
            </div>

            {/* Metadados e Título */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {listing.nomeInterno || input.basicName}
                </h1>
                {id?.layout ? (
                  <Badge variant="outline" className="rounded-lg px-2 py-0 text-[10px] font-bold uppercase tracking-wider">
                    Layout {id.layout} (1:1)
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  <Tag className="size-3 text-primary" />
                  {listing.sku || "SEM SKU"}
                </span>
                {id?.marca ? (
                  <span>
                    Marca: <strong className="text-foreground">{id.marca}</strong>
                  </span>
                ) : null}
                {id?.volume ? (
                  <span>
                    Volume: <strong className="text-foreground">{id.volume}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Botões de Ação Topo */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <CopyButton
              text={anuncioCompleto}
              label="Copiar Tudo"
              variant="default"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
            />
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="h-8 gap-1.5 rounded-xl text-xs font-medium"
              >
                <ArrowLeft className="size-3.5" />
                <span>Novo</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 2. Navegação Segmented Control iOS 18 com Pílula Deslizante */}
      <div className="no-scrollbar flex w-full overflow-x-auto rounded-2xl border border-border/80 bg-muted/50 p-1.5 backdrop-blur-xl">
        <div className="flex w-full min-w-max gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badgeCount =
              tab.id === "referencias"
                ? listing.referencias?.length
                : tab.id === "sku"
                ? listing.variacoesSku?.length
                : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-hidden ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-xl bg-card shadow-sm border border-border/60"
                    transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={`size-3.5 ${isActive ? "text-primary" : ""}`} />
                  <span>{tab.label}</span>
                  {badgeCount ? (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                      {badgeCount}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Conteúdo das Abas com AnimatePresence */}
      <AnimatePresence mode="wait">
        {/* ABA 1: VISÃO GERAL */}
        {activeTab === "resumo" && (
          <motion.div
            key="resumo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            {listing.alertas.length ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Atenção e Confirmações Recomendadas
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900 dark:text-amber-200">
                  {listing.alertas.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Card de Destaque Mercado Livre */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Título Oficial Mercado Livre
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isTitleOptimal ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {titleLength}/60 caracteres
                  </span>
                  <CopyButton text={listing.tituloMercadoLivre} />
                </div>
              </div>
              <p className="mt-2 text-base font-bold text-foreground sm:text-lg">
                {listing.tituloMercadoLivre}
              </p>
            </div>

            {/* Diagnóstico da IA */}
            {listing.resumo ? (
              <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Diagnóstico e Leitura da Embalagem
                </h3>
                <p className="text-xs leading-relaxed text-foreground sm:text-sm">
                  {listing.resumo}
                </p>
              </div>
            ) : null}

            {/* Características Rápidas */}
            {listing.caracteristicas.length ? (
              <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pontos-Chave Identificados
                </h3>
                <div className="flex flex-wrap gap-2">
                  {listing.caracteristicas.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="rounded-lg px-2.5 py-1 text-xs font-medium"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Caixa Texto Puro Unificado */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Texto Completo do Anúncio
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pronto para copiar e colar diretamente no painel do ERP ou Marketplace
                  </p>
                </div>
                <CopyButton text={anuncioCompleto} label="Copiar Tudo" />
              </div>
              <pre className="max-h-72 overflow-auto rounded-xl bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground shadow-inner">
                {anuncioCompleto}
              </pre>
            </div>
          </motion.div>
        )}

        {/* ABA 2: MERCADO LIVRE */}
        {activeTab === "ml" && (
          <motion.div
            key="ml"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            {/* Medidor do Título 60 Chars */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Título Formatado para Busca no Mercado Livre
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Algoritmo do ML valoriza títulos com até 60 caracteres objetivos
                  </p>
                </div>
                <Badge
                  variant={isTitleOptimal ? "secondary" : "outline"}
                  className={`font-mono text-xs ${
                    isTitleOptimal ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {titleLength}/60 chars {isTitleOptimal ? "✓ Perfeito" : "(Ajuste)"}
                </Badge>
              </div>

              {/* Barra de Progresso de Caracteres */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    titleLength <= 60 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, (titleLength / 60) * 100)}%` }}
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={listing.tituloMercadoLivre}
                  onChange={(e) => patch({ tituloMercadoLivre: e.target.value })}
                  className="h-11 flex-1 rounded-xl border border-border bg-muted/20 px-3.5 font-medium text-foreground focus:bg-background"
                />
                <CopyButton text={listing.tituloMercadoLivre} />
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regen("tituloMercadoLivre")}
                    disabled={busy === "tituloMercadoLivre"}
                    className="h-11 rounded-xl px-3"
                  >
                    <RefreshCw className={`size-4 ${busy === "tituloMercadoLivre" ? "animate-spin text-primary" : ""}`} />
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Prévia de Card de Busca no Mercado Livre */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Prévia de Exibição nos Resultados de Busca
              </span>
              <div className="mt-3 flex items-start gap-4 rounded-xl border border-border bg-card p-3.5 shadow-sm">
                <img
                  src={input.photoDataUrl}
                  alt="Foto do produto"
                  className="size-24 rounded-lg object-contain bg-white shrink-0 border"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="line-clamp-2 text-sm font-semibold text-foreground hover:underline cursor-pointer">
                    {listing.tituloMercadoLivre}
                  </h4>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-base font-bold text-foreground">
                      {input.cost ? `R$ ${(Number(input.cost.replace(/\D/g, "")) / 100 || 49.9).toFixed(2)}` : "R$ 49,90"}
                    </span>
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      FULL
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                    Chegará grátis amanhã
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ABA 3: SKU PAI & FILHO */}
        {activeTab === "sku" && (
          <motion.div
            key="sku"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-xs">
              <span className="font-bold text-foreground">Estrutura Padronizada de SKU:</span>
              <p className="mt-1 font-mono text-[11px] text-primary">
                [MARCA][CATEGORIA/PRODUTO][ESPECIFICACAO_FIXA][QTD_BASE] - [VARIACAO]
              </p>
            </div>

            {/* Grid SKU Pai & Filho */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    SKU Pai (Base da Família)
                  </span>
                  <CopyButton text={listing.skuPai || listing.sku} />
                </div>
                <p className="mt-2 font-mono text-xl font-bold text-foreground">
                  {listing.skuPai || listing.sku}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Identifica a linha do produto sem variação final (8 a 16 caracteres).
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    SKU Filho (Variação Ativa)
                  </span>
                  <CopyButton text={listing.skuFilho || listing.sku} />
                </div>
                <p className="mt-2 font-mono text-xl font-bold text-primary">
                  {listing.skuFilho || listing.sku}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Herda o SKU Pai acrescido do sufixo de variação com hífen (-).
                </p>
              </div>
            </div>

            {/* Variações Mapeadas */}
            {listing.variacoesSku && listing.variacoesSku.length > 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                  Variações e SKUs Gerados para Cadastro
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {listing.variacoesSku.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-foreground">
                          {v.variacao}
                        </span>
                        <p className="font-mono text-xs font-bold text-primary">
                          {v.sku}
                        </p>
                      </div>
                      <CopyButton text={v.sku} label="Copiar" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <CopyBlock
              label="Nome Interno (Bling / ERP)"
              hint="Nome para busca interna rápida sem poluição de SEO"
              value={listing.nomeInterno}
              onChange={(v) => patch({ nomeInterno: v })}
              onRegenerate={() => regen("nomeInterno")}
              regenerating={busy === "nomeInterno"}
            />
          </motion.div>
        )}

        {/* ABA 4: DESCRIÇÃO & FICHA TÉCNICA */}
        {activeTab === "descricao" && (
          <motion.div
            key="descricao"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            <CopyBlock
              label="Descrição do Produto"
              hint="Estruturada em seções: Apresentação, Características, Ficha Técnica, Conteúdo, Modo de Uso e FAQ"
              value={listing.descricao}
              multiline
              rows={14}
              onChange={(v) => patch({ descricao: v })}
              onRegenerate={() => regen("descricao")}
              regenerating={busy === "descricao"}
            />

            {/* Ficha Técnica Tabular */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Ficha Técnica Detalhada
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Dados com origem e rastreabilidade visual
                  </p>
                </div>
                <CopyButton text={fichaText(listing)} />
              </div>

              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
                {Object.entries(listing.fichaTecnica).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs"
                  >
                    <span className="font-semibold text-foreground">{k}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{v.value}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] text-muted-foreground"
                      >
                        {SOURCE_LABEL[v.source] || v.source}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ABA 5: IMAGENS 1:1 & LAYOUT */}
        {activeTab === "imagens" && (
          <motion.div
            key="imagens"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            {/* Regras e Especificações da Imagem */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Plano de Imagem de Quebra de Objeções (Proporção 1:1 Quadrada)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Regra absoluta: Imagem perfeitamente quadrada com recorte e cor de acento
                  </p>
                </div>
                {id?.corAcento && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs">
                    <Palette className="size-3.5" />
                    <span
                      className="size-3 rounded-full border border-black/20"
                      style={{ backgroundColor: id.corAcento }}
                    />
                    <span className="font-mono text-[11px]">{id.corAcento}</span>
                  </div>
                )}
              </div>

              {plano ? (
                <div className="mt-4 space-y-4 text-xs">
                  {plano.tituloBloco && (
                    <div className="rounded-xl bg-muted/40 p-3.5">
                      <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                        Bloco de Título (3 Linhas)
                      </span>
                      <p className="mt-1 font-bold text-foreground text-sm">
                        {plano.tituloBloco.linha1} {plano.tituloBloco.linha2}{" "}
                        {plano.tituloBloco.linha3}
                      </p>
                    </div>
                  )}

                  {plano.pontos && (
                    <div>
                      <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                        Pontos de Quebra de Objeção (Caixa Alta até 5 Palavras)
                      </span>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {plano.pontos.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5"
                          >
                            <span className="text-base">{p.icone}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground text-xs">{p.texto}</p>
                              <span className="text-[10px] text-muted-foreground">
                                {p.origem}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Gerador de Imagem com IA */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Gerar Imagem de Anúncio com IA
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Gera uma imagem quadrada 1:1 com recorte profissional
                  </p>
                </div>
                {objImg && (
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      onClick={() => renderImage(0, objImg)}
                      disabled={imageState[0]?.loading}
                      className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md"
                    >
                      {imageState[0]?.loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      <span>Gerar Imagem 1:1</span>
                    </Button>
                  </motion.div>
                )}
              </div>

              {imageState[0]?.url && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <img
                    src={imageState[0].url}
                    alt="Imagem gerada pela IA"
                    className="size-72 rounded-2xl border border-border object-cover shadow-lg"
                  />
                  <a
                    href={imageState[0].url}
                    download="anuncio-1x1.png"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                  >
                    <Download className="size-3.5" />
                    Baixar Imagem 1:1
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ABA 6: REFERÊNCIAS NA WEB */}
        {activeTab === "referencias" && (
          <motion.div
            key="referencias"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Pesquisas e Anúncios Reais na Internet
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Clique em qualquer link abaixo para abrir o produto em marketplaces e extrair fotos, avaliações e ideias de concorrentes
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {listing.referencias?.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/20 p-4 transition-all hover:border-primary/50 hover:bg-card hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {ref.tipo === "oficial" ? (
                        <Globe className="size-5" />
                      ) : (
                        <ShoppingBag className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate text-xs font-bold text-foreground group-hover:text-primary">
                          {ref.titulo}
                        </h4>
                        <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {ref.observacao}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
