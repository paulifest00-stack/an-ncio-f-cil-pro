import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Building2,
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
  Plus,
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
import { Input } from "@/components/ui/input";
import { MercadoLivrePreviewModal } from "@/components/MercadoLivrePreviewModal";
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
  convertToKitServer,
} from "@/lib/ai/product.functions";
import { getUserApiKeys } from "@/lib/ai/user-keys";
import { registerUsage } from "@/lib/usage";
import { formatEan13, generateValidEan13, validateEan13 } from "@/lib/ean";
import { validarNcmOficial, formatNcm } from "@/lib/ncm";
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
    `Principais: ${k?.principais?.join(", ") || NAO_IDENTIFICADO}`,
    `Relacionadas: ${k?.relacionadas?.join(", ") || NAO_IDENTIFICADO}`,
    `Variações de busca: ${k?.variacoes?.join(", ") || NAO_IDENTIFICADO}`,
  ].join("\n");
}

function fichaText(listing: Listing) {
  return Object.entries(listing.fichaTecnica || {})
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
  { id: "ml", label: "Mercado Livre", icon: ShoppingCart },
  { id: "bling", label: "Bling ERP", icon: Layers },
  { id: "resumo", label: "Visão Geral", icon: Package },
  { id: "imagens", label: "Imagens 1:1", icon: ImageIcon },
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
  const [activeTab, setActiveTab] = useState<TabId>("ml");
  const [busy, setBusy] = useState<ListingSection | null>(null);
  const [imageState, setImageState] = useState<
    Record<number, { loading: boolean; url?: string; error?: string }>
  >({});
  const [expandedPrompt, setExpandedPrompt] = useState<Record<number, boolean>>({});
  const [showKitModal, setShowKitModal] = useState(false);
  const [showMlPreview, setShowMlPreview] = useState(false);
  const [isConvertingKit, setIsConvertingKit] = useState(false);
  const [customKitInput, setCustomKitInput] = useState("");
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [kitNotice, setKitNotice] = useState<{
    qty: number;
    isKit: boolean;
    ean: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        data: {
          section,
          input: { ...input, kitQuantity: listing.kitQuantity },
          listing,
          customKeys: getUserApiKeys(),
        },
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
        data: {
          prompt: brief.prompt,
          photoDataUrl: input.photoDataUrl,
          customKeys: getUserApiKeys(),
        },
      });
      registerUsage("imagem");
      setImageState((s) => ({ ...s, [index]: { loading: false, url } }));

      const updatedImagens = [...(listing.imagens || [])];
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
    const updatedImagens = [...(listing.imagens || [])];
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

  const handleSetKitQuantity = async (newQty: number) => {
    setIsConvertingKit(true);
    setError(null);
    try {
      const res = await convertToKitServer({
        data: {
          targetKitQuantity: newQty,
          input: { ...input, kitQuantity: newQty },
          listing,
          customKeys: getUserApiKeys(),
        },
      });
      registerUsage("texto");
      input.kitQuantity = newQty;
      patch(res as Listing);

      setKitNotice({
        qty: newQty,
        isKit: newQty > 1,
        ean: res.ean || generateValidEan13("789"),
      });
      setShowKitModal(false);
    } catch (err) {
      console.error("Erro ao converter para kit:", err);
      setError("Não foi possível converter automaticamente. Tente novamente.");
    } finally {
      setIsConvertingKit(false);
    }
  };

  const copyKeyword = (kw: string) => {
    void navigator.clipboard.writeText(kw);
    setCopiedKeyword(kw);
    setTimeout(() => setCopiedKeyword(null), 1500);
  };

  const id = listing.identificacao;
  const currentNcm = listing.ncm || listing.fichaTecnica?.["NCM"]?.value || "";
  const currentEan = listing.ean || listing.fichaTecnica?.["EAN"]?.value || "";
  const effectiveKitQty = listing.kitQuantity || input.kitQuantity || 1;
  const isKitActive = effectiveKitQty > 1;

  const anuncioCompleto = [
    `SKU: ${listing.sku}`,
    listing.skuPai ? `SKU Pai: ${listing.skuPai}` : "",
    listing.skuFilho ? `SKU Filho: ${listing.skuFilho}` : "",
    isKitActive ? `Formato: KIT PROMOCIONAL (${effectiveKitQty} UNIDADES)` : "Formato: 1 Unidade (Avulso)",
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
      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
      className="mx-auto w-full max-w-full space-y-4 sm:space-y-5 overflow-x-hidden"
    >
      {/* 1. Header do Produto Estilo iOS Frosted Card */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-3.5 sm:p-6 shadow-xl backdrop-blur-2xl">

        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <img
                src={input.photoDataUrl}
                alt={listing.nomeInterno}
                className="size-16 sm:size-18 rounded-2xl border border-border/80 object-cover shadow-md"
              />
              {id?.corAcento ? (
                <span
                  className="absolute -bottom-1 -right-1 size-4 sm:size-5 rounded-full border-2 border-card shadow-sm"
                  style={{ backgroundColor: id.corAcento }}
                  title={`Cor de acento: ${id.corAcento}`}
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {listing.nomeInterno || input.basicName}
                </h1>
                {isKitActive ? (
                  <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    Kit {effectiveKitQty}x
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-foreground">
                  <Tag className="size-3 text-primary" />
                  {listing.sku || "SEM SKU"}
                </span>
                {currentNcm ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-foreground">
                    NCM: {currentNcm}
                  </span>
                ) : null}
                {id?.marca ? (
                  <span className="text-[11px]">
                    Marca: <strong className="text-foreground">{id.marca}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Botões de Ação Topo */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            <motion.div whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKitModal(!showKitModal)}
                disabled={isConvertingKit}
                className="w-full sm:w-auto h-8 gap-1 rounded-xl border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                {isConvertingKit ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Layers className="size-3.5" />
                )}
                <span className="truncate">{isKitActive ? `Kit (${effectiveKitQty}x)` : "Montar Kit"}</span>
              </Button>
            </motion.div>

            <div className="w-full sm:w-auto">
              <CopyButton
                text={anuncioCompleto}
                label="Copiar Tudo"
                variant="default"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              />
            </div>

            <motion.div whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="w-full sm:w-auto h-8 gap-1 rounded-xl text-xs font-medium"
              >
                <ArrowLeft className="size-3.5" />
                <span>Novo</span>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Modal / Gaveta de Conversão para Kit */}
        <AnimatePresence>
          {showKitModal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 border-t border-border/60 pt-4"
            >
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Gerenciador de Kit Multi-Unidades
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Atual: {effectiveKitQty === 1 ? "1 Unidade" : `Kit ${effectiveKitQty}x`}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecione a quantidade. A IA gera novo EAN exclusivo do kit, reescreve a descrição e agrupa as fotos em fundo branco!
                </p>

                {isConvertingKit && (
                  <div className="my-3 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs font-semibold text-primary">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Recalculando e adaptando todo o anúncio para o Kit...</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { qty: 1, label: "1 Un (Avulso)" },
                    { qty: 2, label: "Kit 2x" },
                    { qty: 3, label: "Kit 3x" },
                    { qty: 4, label: "Kit 4x" },
                    { qty: 5, label: "Kit 5x" },
                    { qty: 6, label: "Kit 6x" },
                    { qty: 10, label: "Kit 10x" },
                    { qty: 12, label: "Kit 12x" },
                  ].map((k) => (
                    <button
                      key={k.qty}
                      type="button"
                      disabled={isConvertingKit}
                      onClick={() => handleSetKitQuantity(k.qty)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                        effectiveKitQty === k.qty
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "border border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
                  <span className="text-xs font-medium text-foreground">Outra quantidade:</span>
                  <Input
                    type="number"
                    min={2}
                    max={1000}
                    placeholder="Ex: 8"
                    value={customKitInput}
                    disabled={isConvertingKit}
                    onChange={(e) => setCustomKitInput(e.target.value)}
                    className="h-8 w-20 rounded-lg text-center font-mono text-xs font-bold"
                  />
                  <Button
                    size="sm"
                    disabled={isConvertingKit}
                    onClick={() => {
                      const num = parseInt(customKitInput, 10);
                      if (num >= 1) void handleSetKitQuantity(num);
                    }}
                    className="h-8 rounded-lg text-xs font-semibold"
                  >
                    {isConvertingKit ? <Loader2 className="size-3.5 animate-spin" /> : "Aplicar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Banner de Conversão de Kit */}
      <AnimatePresence>
        {kitNotice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-100 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <ShieldCheck className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    {kitNotice.isKit
                      ? `Anúncio adaptado para Kit com ${kitNotice.qty} Unidades!`
                      : "Anúncio adaptado para 1 Unidade Avulsa!"}
                  </h4>
                  <p className="mt-0.5 text-xs text-emerald-900/90 dark:text-emerald-200">
                    Novo EAN-13: <strong className="font-mono">{kitNotice.ean}</strong> • Título, fotos em fundo branco e descrição atualizados com sucesso.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKitNotice(null)}
                className="rounded-lg p-1 text-emerald-800/60 hover:bg-emerald-500/20"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Navegação Segmented Control iOS com Pílula Deslizante */}
      <div className="no-scrollbar flex w-full overflow-x-auto rounded-2xl border border-border/80 bg-muted/40 p-1 backdrop-blur-xl">
        <div className="flex w-full min-w-max gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badgeCount =
              tab.id === "referencias"
                ? listing.referencias?.length
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

      {/* 3. Conteúdo das Abas */}
      <AnimatePresence mode="wait">
        {/* ABA 1: MERCADO LIVRE (COMPLETA E INTEGRADA) */}
        {activeTab === "ml" && (
          <motion.div
            key="ml"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-5"
          >
            {/* Banner de Ação: Ver Prévia Real no Mercado Livre */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFE600] text-neutral-900 font-black text-sm shadow-md">
                  ML
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Anúncio Pronto para o Mercado Livre
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Título otimizado, fotos 1:1, descrição comercial e palavras-chave ranqueadas.
                  </p>
                </div>
              </div>

              <motion.div whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                <Button
                  onClick={() => setShowMlPreview(true)}
                  className="w-full sm:w-auto h-9 gap-2 rounded-xl bg-neutral-900 text-xs font-bold text-white shadow-md hover:bg-neutral-800"
                >
                  <Eye className="size-3.5 text-amber-400" />
                  <span>Ver Prévia no Mercado Livre</span>
                </Button>
              </motion.div>
            </div>

            {/* Bloco 1: Título 60 Caracteres */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Título Oficial (Algoritmo Mercado Livre)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Máximo de 60 caracteres objetivos para maior conversão nas buscas
                  </p>
                </div>
                <Badge
                  variant={isTitleOptimal ? "secondary" : "outline"}
                  className={`font-mono text-xs ${
                    isTitleOptimal ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"
                  }`}
                >
                  {titleLength}/60 chars {isTitleOptimal ? "✓ Perfeito" : "(Ajuste)"}
                </Badge>
              </div>

              {/* Barra de Progresso */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    titleLength <= 60 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, (titleLength / 60) * 100)}%` }}
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={listing.tituloMercadoLivre}
                  onChange={(e) => patch({ tituloMercadoLivre: e.target.value })}
                  className="h-10 flex-1 rounded-xl bg-background font-medium text-foreground text-xs sm:text-sm"
                />
                <CopyButton text={listing.tituloMercadoLivre} />
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regen("tituloMercadoLivre")}
                    disabled={busy === "tituloMercadoLivre"}
                    className="h-10 rounded-xl px-3"
                    title="Regenerar título com IA"
                  >
                    <RefreshCw className={`size-3.5 ${busy === "tituloMercadoLivre" ? "animate-spin text-primary" : ""}`} />
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Bloco 2: Galeria de Fotos 1:1 */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Fotos do Catálogo (Proporção 1:1 Quadrada)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Fotos em alta definição preparadas para o Mercado Livre
                  </p>
                </div>
                {id?.layout && (
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Layout {id.layout} (1:1)
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {listing.imagens?.map((brief, idx) => {
                  const state = imageState[idx] || {};
                  return (
                    <div
                      key={idx}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-muted/20 p-2.5 transition-all hover:border-primary/40"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-primary uppercase">
                            Foto {idx + 1}
                          </span>
                          <span className="text-[9px] font-medium text-muted-foreground uppercase">
                            {brief.tipo}
                          </span>
                        </div>

                        {/* Visualizador da Imagem */}
                        <div className="relative mt-1.5 aspect-square w-full overflow-hidden rounded-lg border border-border/60 bg-white flex items-center justify-center">
                          {state.url ? (
                            <img
                              src={state.url}
                              alt={brief.titulo}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-2 text-center text-muted-foreground">
                              <ImageIcon className="size-5 opacity-40" />
                              <span className="mt-1 text-[10px] font-medium leading-tight">
                                {brief.titulo}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ações da Imagem */}
                      <div className="mt-2 flex items-center justify-between gap-1">
                        {state.url ? (
                          <>
                            <a
                              href={state.url}
                              download={`foto-${idx + 1}-${brief.tipo}.png`}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-card border border-border px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-accent"
                            >
                              <Download className="size-3" />
                              <span>Baixar</span>
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => renderImage(idx, brief)}
                              disabled={state.loading}
                              className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-primary"
                              title="Regenerar foto"
                            >
                              <RefreshCw className={`size-3 ${state.loading ? "animate-spin" : ""}`} />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => renderImage(idx, brief)}
                            disabled={state.loading}
                            className="w-full h-7 gap-1 rounded-lg bg-primary text-[10px] font-bold text-white shadow-xs"
                          >
                            {state.loading ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Sparkles className="size-3" />
                            )}
                            <span>Gerar 1:1</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloco 3: Descrição Comercial Formatada */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Descrição Comercial de Alta Conversão
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Estruturada em seções para responder todas as dúvidas do comprador
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={listing.descricao} label="Copiar Descrição" />
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regen("descricao")}
                      disabled={busy === "descricao"}
                      className="h-8 rounded-xl px-2.5 text-xs font-semibold"
                    >
                      <RefreshCw className={`size-3.5 ${busy === "descricao" ? "animate-spin text-primary" : ""}`} />
                      <span className="hidden sm:inline ml-1">Regenerar</span>
                    </Button>
                  </motion.div>
                </div>
              </div>

              <textarea
                rows={10}
                value={listing.descricao}
                onChange={(e) => patch({ descricao: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted/20 p-3.5 font-sans text-xs leading-relaxed text-foreground focus:bg-background"
              />
            </div>

            {/* Bloco 4: Pesquisa de Mercado & Palavras-Chave SEO */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Pesquisa de Mercado & Palavras-Chave de Busca
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Termos de maior volume de busca no Mercado Livre (toque para copiar)
                  </p>
                </div>
                <CopyButton
                  text={keywordsText(listing)}
                  label="Copiar Todas"
                />
              </div>

              <div className="space-y-3">
                {/* Principais */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Termos Principais (Maior Volume):
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {listing.palavrasChave?.principais?.map((kw, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => copyKeyword(kw)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
                          copiedKeyword === kw
                            ? "bg-emerald-600 text-white"
                            : "border border-border/80 bg-muted/30 text-foreground hover:border-primary/50 hover:bg-card"
                        }`}
                      >
                        {copiedKeyword === kw ? "✓ Copiado!" : kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Relacionadas / Cauda Longa */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cauda Longa & Intenção de Compra:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {listing.palavrasChave?.relacionadas?.map((kw, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => copyKeyword(kw)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
                          copiedKeyword === kw
                            ? "bg-emerald-600 text-white"
                            : "border border-border/80 bg-muted/30 text-foreground hover:border-primary/50 hover:bg-card"
                        }`}
                      >
                        {copiedKeyword === kw ? "✓ Copiado!" : kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variações de Busca */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Variações Populares & Sinônimos:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {listing.palavrasChave?.variacoes?.map((kw, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => copyKeyword(kw)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
                          copiedKeyword === kw
                            ? "bg-emerald-600 text-white"
                            : "border border-border/80 bg-muted/30 text-foreground hover:border-primary/50 hover:bg-card"
                        }`}
                      >
                        {copiedKeyword === kw ? "✓ Copiado!" : kw}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ABA 2: BLING ERP (CADASTRO ESTRUTURADO DE PRODUTO) */}
        {activeTab === "bling" && (
          <motion.div
            key="bling"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-5"
          >
            {/* Header do Cadastro Bling */}
            <div className="flex items-center justify-between rounded-2xl border border-blue-600/30 bg-blue-600/5 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Cadastro de Produto no Bling ERP
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Campos estruturados para integração e sincronização com ERP
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-600/15 text-blue-600 text-xs font-bold">
                {isKitActive ? "Kit / Composição" : "Produto Simples"}
              </Badge>
            </div>

            {/* Seção 1: Identificação Básica */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border/60 pb-2">
                1. Identificação Geral
              </h4>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">
                      Nome Interno (Descrição no Bling)
                    </span>
                    <CopyButton text={listing.nomeInterno} />
                  </div>
                  <Input
                    value={listing.nomeInterno}
                    onChange={(e) => patch({ nomeInterno: e.target.value })}
                    className="h-10 rounded-xl font-medium"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Nome limpo e padronizado sem poluição de SEO para busca rápida no caixa e expedição.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <span className="text-[11px] text-muted-foreground font-medium">Formato:</span>
                    <p className="mt-0.5 font-bold text-xs text-foreground">
                      {isKitActive ? `Kit Composição (${effectiveKitQty} un)` : "Simples"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <span className="text-[11px] text-muted-foreground font-medium">Unidade:</span>
                    <p className="mt-0.5 font-bold text-xs text-foreground">
                      {isKitActive ? "KT / PCT" : "UN"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <span className="text-[11px] text-muted-foreground font-medium">Situação:</span>
                    <p className="mt-0.5 font-bold text-xs text-emerald-600">
                      Ativo
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Estrutura de SKU (Pai e Filho) */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border/60 pb-2">
                2. Estrutura de SKU (Código do Produto)
              </h4>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* SKU Pai */}
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      SKU Pai (Base da Família)
                    </span>
                    <CopyButton text={listing.skuPai || listing.sku} />
                  </div>
                  <Input
                    value={listing.skuPai || listing.sku}
                    onChange={(e) => patch({ skuPai: e.target.value })}
                    className="h-10 rounded-xl font-mono text-sm font-bold text-foreground bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Identifica a linha do item sem o atributo variável (ex: cor, tamanho ou sabor).
                  </p>
                </div>

                {/* SKU Filho */}
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      SKU Filho (Item Ativo)
                    </span>
                    <CopyButton text={listing.skuFilho || listing.sku} />
                  </div>
                  <Input
                    value={listing.skuFilho || listing.sku}
                    onChange={(e) => patch({ skuFilho: e.target.value })}
                    className="h-10 rounded-xl font-mono text-sm font-bold text-primary bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Código exclusivo com sufixo da variação ou kit correspondente.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 3: Dados Tributários & EAN-13 */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground border-b border-border/60 pb-2">
                3. Tributação Fiscal & Código de Barras (GTIN / EAN)
              </h4>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* NCM */}
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">
                        Classificação Fiscal (NCM)
                      </span>
                      {(() => {
                        const ncmCheck = validarNcmOficial(currentNcm);
                        if (ncmCheck.valido) {
                          return (
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check className="size-2.5" /> Oficial Siscomex
                            </span>
                          );
                        }
                        if (currentNcm && currentNcm !== NAO_IDENTIFICADO) {
                          return (
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="size-2.5" /> Atenção
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {currentNcm && (
                      <a
                        href={`https://www.google.com/search?q=tabela+ncm+${encodeURIComponent(currentNcm.replace(/\D/g, ""))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                      >
                        <span>Tabela NCM</span>
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentNcm}
                      placeholder="0000.00.00"
                      onChange={(e) => {
                        const val = e.target.value;
                        const check = validarNcmOficial(val);
                        const updatedFicha = { ...listing.fichaTecnica };
                        updatedFicha["NCM"] = {
                          value: val,
                          source: "usuario",
                          note: check.valido ? `Oficial: ${check.descricaoOficial}` : undefined,
                        };
                        patch({
                          ncm: val,
                          ncmValidado: check.valido,
                          ncmDescricaoOficial: check.descricaoOficial,
                          fichaTecnica: updatedFicha,
                        });
                      }}
                      className="h-10 rounded-xl font-mono text-xs font-bold bg-background"
                    />
                    {currentNcm && <CopyButton text={currentNcm} />}
                  </div>
                  {(() => {
                    const ncmCheck = validarNcmOficial(currentNcm);
                    if (ncmCheck.valido && ncmCheck.descricaoOficial) {
                      return (
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded-lg leading-relaxed font-medium">
                          ✓ <strong>Siscomex:</strong> {ncmCheck.descricaoOficial}
                        </p>
                      );
                    }
                    if (ncmCheck.aviso) {
                      return (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight">
                          {ncmCheck.aviso}
                        </p>
                      );
                    }
                    return (
                      <p className="text-[10px] text-muted-foreground">
                        Código de 8 dígitos para emissão de notas fiscais (NF-e).
                      </p>
                    );
                  })()}
                </div>


                {/* EAN-13 */}
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">
                        GTIN / EAN-13
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
                      className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                    >
                      <Zap className="size-3" />
                      Gerar Novo EAN
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentEan}
                      placeholder="789..."
                      onChange={(e) => {
                        const val = e.target.value;
                        const updatedFicha = { ...listing.fichaTecnica };
                        updatedFicha["EAN"] = { value: val, source: "usuario" };
                        patch({ ean: val, fichaTecnica: updatedFicha });
                      }}
                      className="h-10 rounded-xl font-mono text-xs font-bold bg-background"
                    />
                    {currentEan && <CopyButton text={currentEan} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Padrão GS1 Brasil com cálculo de checksum Módulo 10.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 4: Matriz de Variações */}
            {listing.variacoesSku && listing.variacoesSku.length > 0 && (
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      4. Matriz de Variações da Linha
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Variações mapeadas com seus respectivos SKUs Filhos e EANs
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateAllVariationEans}
                    className="h-8 gap-1 rounded-xl text-xs font-semibold text-primary"
                  >
                    <Zap className="size-3" />
                    Gerar Todos os EANs
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {listing.variacoesSku.map((v, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {v.variacao}
                        </span>
                        <CopyButton text={v.sku} label="Copiar SKU" />
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[11px] text-muted-foreground">SKU:</span>
                        <strong className="text-primary">{v.sku}</strong>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                        <span className="text-[11px] text-muted-foreground">EAN:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-foreground">
                            {v.ean || "Sem EAN"}
                          </span>
                          {v.ean ? (
                            <CopyButton text={v.ean} label="Copiar" />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateVariationEan(i)}
                              className="h-6 gap-1 rounded-lg text-[10px] font-bold text-primary px-2"
                            >
                              <Zap className="size-2.5" />
                              Gerar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seção 5: Ficha Técnica & Características */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    5. Características Técnicas & Dimensões
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Atributos para preencher na aba de características do Bling
                  </p>
                </div>
                <CopyButton text={fichaText(listing)} label="Copiar Ficha" />
              </div>

              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
                {Object.entries(listing.fichaTecnica || {}).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs"
                  >
                    <span className="font-semibold text-foreground">{k}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{v.value}</span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] text-muted-foreground"
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

        {/* ABA 3: VISÃO GERAL */}
        {activeTab === "resumo" && (
          <motion.div
            key="resumo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            {listing.alertas?.length ? (
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

            {listing.resumo ? (
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm">
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Diagnóstico e Leitura da Embalagem
                </h3>
                <p className="text-xs leading-relaxed text-foreground sm:text-sm">
                  {listing.resumo}
                </p>
              </div>
            ) : null}

            {listing.caracteristicas?.length ? (
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pontos-Chave Identificados
                </h3>
                <div className="flex flex-wrap gap-1.5">
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
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Texto Completo do Anúncio
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pronto para copiar e colar diretamente onde desejar
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

        {/* ABA 4: IMAGENS 1:1 & PROMPTS */}
        {activeTab === "imagens" && (
          <motion.div
            key="imagens"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Galeria Completa de Imagens (1:1)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Gere fotos de estúdio com IA ou copie os prompts para usar em ferramentas externas
                  </p>
                </div>
                {id?.corAcento && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1 text-xs">
                    <Palette className="size-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Cor:</span>
                    <span
                      className="size-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: id.corAcento }}
                    />
                    <span className="font-mono text-[11px] font-bold">{id.corAcento}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {listing.imagens?.map((brief, idx) => {
                const state = imageState[idx] || {};
                const isPromptOpen = !!expandedPrompt[idx];

                return (
                  <div
                    key={idx}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div>
                          <Badge
                            variant="outline"
                            className="rounded-lg px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-primary"
                          >
                            Foto {idx + 1} • {brief.tipo.toUpperCase()}
                          </Badge>
                          <h4 className="mt-1 text-sm font-bold text-foreground">
                            {brief.titulo}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {brief.observacoes}
                          </p>
                        </div>
                      </div>

                      {state.url ? (
                        <div className="mt-3 flex flex-col items-center gap-3">
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
                                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black shadow-lg hover:bg-neutral-100 active:scale-95 flex items-center gap-1.5"
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
                              Baixar 1:1
                            </a>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => renderImage(idx, brief)}
                                disabled={state.loading}
                                className="h-8 gap-1 rounded-xl text-xs"
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
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {state.error && (
                        <div className="mt-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                          {state.error}
                        </div>
                      )}
                    </div>

                    {/* Rodapé: Prompts e Botão de Gerar */}
                    <div className="mt-3 space-y-2 border-t border-border/60 pt-2.5">
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
                          <span>{isPromptOpen ? "Ocultar Prompt" : "Ver Prompt da Imagem"}</span>
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
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="font-bold text-muted-foreground uppercase text-[9px]">
                                    Prompt Fotográfico
                                  </span>
                                  <CopyButton text={brief.prompt} label="Copiar" />
                                </div>
                                <p className="font-mono text-foreground leading-relaxed">
                                  {brief.prompt}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {!state.url && (
                        <motion.div whileTap={{ scale: 0.96 }}>
                          <Button
                            size="sm"
                            onClick={() => renderImage(idx, brief)}
                            disabled={state.loading}
                            className="w-full gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md"
                          >
                            {state.loading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="size-3.5" />
                            )}
                            <span>Gerar Imagem 1:1</span>
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

        {/* ABA 5: REFERÊNCIAS */}
        {activeTab === "referencias" && (
          <motion.div
            key="referencias"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm">
              <div className="mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Pesquisas e Concorrentes na Internet
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Acesse links diretos do produto em marketplaces para comparar preços e fotos
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {listing.referencias?.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3.5 transition-all hover:border-primary/50 hover:bg-card hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {ref.tipo === "oficial" ? (
                        <Globe className="size-4.5" />
                      ) : (
                        <ShoppingBag className="size-4.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate text-xs font-bold text-foreground group-hover:text-primary">
                          {ref.titulo}
                        </h4>
                        <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
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

      {/* Modal de Prévia Realística no Mercado Livre */}
      <MercadoLivrePreviewModal
        isOpen={showMlPreview}
        onClose={() => setShowMlPreview(false)}
        listing={listing}
        input={input}
      />
    </motion.div>
  );
}
