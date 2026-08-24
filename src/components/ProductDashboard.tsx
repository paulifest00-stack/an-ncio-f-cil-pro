import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Globe,
  ImageIcon,
  Info,
  Layers,
  Loader2,
  Package,
  Palette,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  Zap,
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
  SkuVariacao,
} from "@/lib/ai/types";
import { NAO_IDENTIFICADO } from "@/lib/ai/types";
import {
  generateAdImage,
  regenerateSection,
} from "@/lib/ai/product.functions";
import { registerUsage } from "@/lib/usage";
import { formatEan13, generateValidEan13, validateEan13 } from "@/lib/ean";
import { saveProductToHistory } from "@/components/RecentListings";

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
  { id: "sku", label: "SKU & Fiscal (NCM/EAN)", icon: Tag },
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
  const [expandedPrompt, setExpandedPrompt] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Inicializa o estado das imagens com base no que já foi salvo anteriormente
  useEffect(() => {
    if (listing.imagens && listing.imagens.length > 0) {
      const initial: Record<number, { loading: boolean; url?: string }> = {};
      listing.imagens.forEach((img, idx) => {
        if (img.url) {
          initial[idx] = { loading: false, url: img.url };
        }
      });
      setImageState((prev) => ({ ...initial, ...prev }));
    }
  }, [listing.imagens]);

  const patch = (p: Partial<Listing>) => {
    const updated = { ...listing, ...p };
    setListing(updated);
    saveProductToHistory(input, updated);
  };

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

      // Salva a imagem gerada na listagem e persiste automaticamente no Supabase / Histórico
      const updatedImagens = [...listing.imagens];
      if (updatedImagens[index]) {
        updatedImagens[index] = { ...updatedImagens[index], url };
      }
      patch({ imagens: updatedImagens });
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

  const handleDeleteImage = (index: number) => {
    setImageState((s) => ({ ...s, [index]: { loading: false, url: undefined } }));
    const updatedImagens = [...listing.imagens];
    if (updatedImagens[index]) {
      updatedImagens[index] = { ...updatedImagens[index], url: undefined };
    }
    patch({ imagens: updatedImagens });
  };

  const handleGenerateMainEan = () => {
    const newEan = generateValidEan13("789");
    const updatedFicha = { ...listing.fichaTecnica };
    updatedFicha["EAN"] = { value: newEan, source: "usuario" };
    patch({ ean: newEan, fichaTecnica: updatedFicha });
  };

  const handleGenerateVariationEan = (index: number) => {
    const newEan = generateValidEan13("789");
    const updatedVars = [...(listing.variacoesSku || [])];
    if (updatedVars[index]) {
      updatedVars[index] = { ...updatedVars[index], ean: newEan };
      patch({ variacoesSku: updatedVars });
    }
  };

  const handleGenerateAllVariationEans = () => {
    const updatedVars = (listing.variacoesSku || []).map((v) => ({
      ...v,
      ean: v.ean || generateValidEan13("789"),
    }));
    patch({ variacoesSku: updatedVars });
  };

  const id = listing.identificacao;
  const currentNcm = listing.ncm || listing.fichaTecnica?.["NCM"]?.value || "";
  const currentEan = listing.ean || listing.fichaTecnica?.["EAN"]?.value || "";

  const anuncioCompleto = [
    `SKU: ${listing.sku}`,
    listing.skuPai ? `SKU Pai: ${listing.skuPai}` : "",
    listing.skuFilho ? `SKU Filho: ${listing.skuFilho}` : "",
    currentNcm ? `NCM: ${currentNcm}` : "",
    currentEan ? `EAN-13: ${currentEan}` : "",
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
                {currentNcm ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                    NCM: {currentNcm}
                  </span>
                ) : null}
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
                : tab.id === "imagens"
                ? listing.imagens?.length
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

            {/* Card Rápido de NCM & EAN */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    NCM (Classificação Fiscal)
                  </span>
                  {currentNcm && <CopyButton text={currentNcm} label="Copiar" />}
                </div>
                <p className="mt-1.5 font-mono text-base font-bold text-foreground">
                  {currentNcm || "Não identificado"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Nomenclatura Comum do Mercosul para notas fiscais
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Código de Barras EAN-13
                  </span>
                  {currentEan ? (
                    <CopyButton text={currentEan} label="Copiar" />
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateMainEan}
                      className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                    >
                      <Zap className="size-3" />
                      Gerar EAN
                    </button>
                  )}
                </div>
                <p className="mt-1.5 font-mono text-base font-bold text-primary">
                  {currentEan || "Sem código gerado"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Código de barras oficial para marketplace e ERP
                </p>
              </div>
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

        {/* ABA 3: SKU, FISCAL (NCM) & GERADOR EAN-13 */}
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

            {/* CARD FISCAL: NCM & GERADOR DE EAN-13 */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Barcode className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Dados Fiscais & Código de Barras EAN-13
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      NCM pesquisado pela IA e Gerador de EAN-13 válido (padrão GS1 Brasil)
                    </p>
                  </div>
                </div>
                {listing.variacoesSku && listing.variacoesSku.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateAllVariationEans}
                    className="h-8 gap-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    <Zap className="size-3.5" />
                    Gerar EANs para Todas as Variações
                  </Button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* NCM Card */}
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      NCM (Nomenclatura Comum do Mercosul)
                    </span>
                    {currentNcm && (
                      <a
                        href={`https://www.google.com/search?q=tabela+ncm+${encodeURIComponent(currentNcm.replace(/\D/g, ""))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                        title="Ver detalhes na tabela NCM"
                      >
                        <span>Consultar</span>
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={currentNcm}
                      placeholder="Ex: 1905.90.90"
                      onChange={(e) => {
                        const val = e.target.value;
                        const updatedFicha = { ...listing.fichaTecnica };
                        updatedFicha["NCM"] = { value: val, source: "usuario" };
                        patch({ ncm: val, fichaTecnica: updatedFicha });
                      }}
                      className="h-9 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-xs font-bold text-foreground"
                    />
                    {currentNcm && <CopyButton text={currentNcm} />}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Classificação fiscal sugerida com base no material e categoria do produto.
                  </p>
                </div>

                {/* EAN-13 Card */}
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">
                        EAN-13 Principal
                      </span>
                      {currentEan && validateEan13(currentEan) && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600">
                          Válido
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateMainEan}
                      className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                    >
                      <Wand2 className="size-3" />
                      Gerar Novo EAN
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={currentEan}
                      placeholder="789... ou clique em Gerar"
                      onChange={(e) => {
                        const val = e.target.value;
                        const updatedFicha = { ...listing.fichaTecnica };
                        updatedFicha["EAN"] = { value: val, source: "usuario" };
                        patch({ ean: val, fichaTecnica: updatedFicha });
                      }}
                      className="h-9 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-xs font-bold text-foreground"
                    />
                    {currentEan && <CopyButton text={currentEan} />}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Código de barras padrão brasileiro GS1 com cálculo oficial de checksum Módulo 10.
                  </p>
                </div>
              </div>
            </div>

            {/* Variações Mapeadas com EAN Individual */}
            {listing.variacoesSku && listing.variacoesSku.length > 0 ? (
              <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                  Variações, SKUs & Códigos EAN-13
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {listing.variacoesSku.map((v, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/70 bg-muted/30 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {v.variacao}
                        </span>
                        <CopyButton text={v.sku} label="Copiar SKU" />
                      </div>
                      <p className="mt-1 font-mono text-xs font-bold text-primary">
                        SKU: {v.sku}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">EAN:</span>
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {v.ean || "Sem EAN"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {v.ean ? (
                            <CopyButton text={v.ean} label="Copiar EAN" />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateVariationEan(i)}
                              className="h-7 gap-1 rounded-lg text-[11px] font-bold text-primary"
                            >
                              <Zap className="size-3" />
                              Gerar EAN
                            </Button>
                          )}
                        </div>
                      </div>
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
                    Ficha Técnica Detalhada (Inclui NCM e EAN)
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

        {/* ABA 5: IMAGENS 1:1, PROMPTS & LAYOUT */}
        {activeTab === "imagens" && (
          <motion.div
            key="imagens"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-6"
          >
            {/* Cabeçalho explicativo */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Galeria de Imagens do Anúncio (Proporção 1:1 Quadrada)
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Gere fotos profissionais para o catálogo do Mercado Livre ou copie os prompts para usar em IAs externas (Midjourney, DALL-E, Flux, Ideogram).
                  </p>
                </div>
                {id?.corAcento && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1 text-xs">
                    <Palette className="size-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Cor de Acento:</span>
                    <span
                      className="size-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: id.corAcento }}
                    />
                    <span className="font-mono text-[11px] font-bold">{id.corAcento}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid com TODAS as 4 Imagens do Anúncio */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {listing.imagens.map((brief, idx) => {
                const state = imageState[idx] || {};
                const isPromptOpen = !!expandedPrompt[idx];
                const hasPlano = brief.tipo === "objecoes" && brief.plano;

                return (
                  <div
                    key={idx}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm transition-all hover:border-primary/40"
                  >
                    <div>
                      {/* Topo do Card de Imagem */}
                      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-lg px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-primary"
                            >
                              Foto {idx + 1} • {brief.tipo.toUpperCase()}
                            </Badge>
                          </div>
                          <h4 className="mt-1 text-sm font-bold text-foreground">
                            {brief.titulo}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {brief.observacoes}
                          </p>
                        </div>
                      </div>

                      {/* Se for Imagem de Quebra de Objeções, exibe os pontos do plano */}
                      {hasPlano && brief.plano && (
                        <div className="mt-3 space-y-2 rounded-xl bg-muted/30 p-3 text-xs">
                          {brief.plano.tituloBloco && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Bloco de Título (3 Linhas)
                              </span>
                              <p className="font-bold text-foreground">
                                {brief.plano.tituloBloco.linha1} {brief.plano.tituloBloco.linha2}{" "}
                                {brief.plano.tituloBloco.linha3}
                              </p>
                            </div>
                          )}
                          {brief.plano.pontos && brief.plano.pontos.length > 0 && (
                            <div className="border-t border-border/40 pt-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Diferenciais Visuais
                              </span>
                              <div className="mt-1 grid grid-cols-1 gap-1">
                                {brief.plano.pontos.map((p, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-1.5 text-[11px] text-foreground"
                                  >
                                    <span>{p.icone}</span>
                                    <span className="font-semibold">{p.texto}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Exibição da Imagem Gerada (se existir) */}
                      {state.url ? (
                        <div className="mt-4 flex flex-col items-center gap-3">
                          <div className="relative group w-full aspect-square overflow-hidden rounded-xl border border-border bg-muted/40 shadow-inner">
                            <img
                              src={state.url}
                              alt={brief.titulo}
                              className="size-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                              <a
                                href={state.url}
                                download={`imagem-${idx + 1}-${brief.tipo}.png`}
                                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black shadow-lg hover:bg-neutral-100 transition-transform active:scale-95 flex items-center gap-1.5"
                              >
                                <Download className="size-3.5" />
                                Baixar 1:1
                              </a>
                            </div>
                          </div>

                          <div className="flex w-full items-center justify-between gap-2">
                            <a
                              href={state.url}
                              download={`imagem-${idx + 1}-${brief.tipo}.png`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                            >
                              <Download className="size-3.5" />
                              Baixar Imagem 1:1
                            </a>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => renderImage(idx, brief)}
                                disabled={state.loading}
                                className="h-8 gap-1 rounded-xl text-xs"
                                title="Gerar uma nova versão com a IA"
                              >
                                {state.loading ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="size-3" />
                                )}
                                <span>Regenerar</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteImage(idx)}
                                className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Excluir imagem gerada"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Mensagem de Erro se Houver */}
                      {state.error && (
                        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                          {state.error}
                        </div>
                      )}
                    </div>

                    {/* Rodapé do Card: Prompt da IA e Ação de Gerar */}
                    <div className="mt-4 space-y-2.5 border-t border-border/60 pt-3">
                      {/* Gaveta Recolhível do Prompt */}
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPrompt((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        >
                          <Code className="size-3 text-primary" />
                          <span>{isPromptOpen ? "Ocultar Prompt da IA" : "Ver Prompt da IA"}</span>
                          <ChevronDown
                            className={`size-3 transition-transform duration-200 ${
                              isPromptOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {isPromptOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-2 overflow-hidden"
                            >
                              <div className="rounded-xl bg-muted/40 p-3 text-[11px]">
                                <div className="mb-1.5 flex items-center justify-between">
                                  <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">
                                    Prompt Fotográfico (Inglês)
                                  </span>
                                  <CopyButton text={brief.prompt} label="Copiar Prompt" />
                                </div>
                                <p className="font-mono text-foreground leading-relaxed">
                                  {brief.prompt}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Botão de Geração se ainda não foi gerada */}
                      {!state.url && (
                        <motion.div whileTap={{ scale: 0.96 }}>
                          <Button
                            size="sm"
                            onClick={() => renderImage(idx, brief)}
                            disabled={state.loading}
                            className="w-full gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
                          >
                            {state.loading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="size-3.5" />
                            )}
                            <span>Gerar Imagem 1:1 com IA</span>
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
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
