import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Info,
  Layers,
  Loader2,
  PackagePlus,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { quickScanPhoto } from "@/lib/ai/product.functions";
import { generateValidEan13 } from "@/lib/ean";
import type { Identificacao, ProductInput } from "@/lib/ai/types";

const MAX_SIDE = 1400;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

const PRESETS = [
  { label: "🍬 Paçoca Rolha 1kg", name: "Paçoca Rolha 100un 1kg", brand: "Yoki" },
  { label: "🎈 Balão Látex 9 Pol", name: "Balão Látex Liso 9 Polegadas 50un", brand: "Pic Pic" },
  { label: "🧤 Luva Nitrílica Preta", name: "Luva Nitrílica Sem Pó Preta Caixa 100un", brand: "Bompack" },
  { label: "🎨 Tinta Spray Cabelo", name: "Tinta Pinta Cabelo Temporária 150ml", brand: "Popper" },
];

export function NewProductForm({
  onSubmit,
}: {
  onSubmit: (input: ProductInput) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [basicName, setBasicName] = useState("");
  const [kitQuantity, setKitQuantity] = useState<number>(1);
  const [isCustomKit, setIsCustomKit] = useState(false);
  const [customKitVal, setCustomKitVal] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [optional, setOptional] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [cachedIdentificacao, setCachedIdentificacao] = useState<Identificacao | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (key: string, value: string) =>
    setOptional((prev) => ({ ...prev, [key]: value }));

  const scanImage = async (compressedDataUrl: string) => {
    setIsScanning(true);
    setScanSuccessMsg(null);
    try {
      const res = (await quickScanPhoto({
        data: { photoDataUrl: compressedDataUrl },
      })) as {
        identificacao?: Identificacao;
        sugestoes?: {
          basicName?: string;
          brand?: string;
          category?: string;
          weight?: string;
          packaging?: string;
          units?: string;
          ean?: string;
        };
        error?: string;
        status?: "ok" | "sem_creditos" | "error";
        hasContent?: boolean;
      };

      if (res) {
        if (res.status === "sem_creditos" || res.error?.includes("Créditos") || res.error?.includes("402")) {
          setError("Seus créditos de IA no Lovable estão esgotados no momento. Você ainda pode preencher os campos e salvar normalmente!");
          setScanSuccessMsg(null);
          return;
        }

        const sugestoes = res.sugestoes;
        const autoName = sugestoes?.basicName;
        const brand = sugestoes?.brand;
        const category = sugestoes?.category;
        const weight = sugestoes?.weight;
        const packaging = sugestoes?.packaging;
        const ean = sugestoes?.ean;

        // Preenche o nome básico se foi identificado
        if (autoName) {
          setBasicName(autoName);
        }

        // Preenche campos opcionais identificados
        if (brand || category || weight || packaging || ean) {
          setOptional((prev) => ({
            ...prev,
            ...(brand ? { brand } : {}),
            ...(category ? { category } : {}),
            ...(weight ? { weight } : {}),
            ...(packaging ? { packaging } : {}),
            ...(ean ? { ean } : {}),
          }));
          setShowOptional(true);
        }

        // Guarda a identificação para reutilizar na geração completa sem gastar créditos duplicados
        if (res.identificacao) {
          setCachedIdentificacao(res.identificacao);
        }

        const foundItems = [
          autoName && `Produto: ${autoName}`,
          brand && `Marca: ${brand}`,
          weight && `Vol: ${weight}`,
        ].filter(Boolean);

        if (foundItems.length > 0) {
          setScanSuccessMsg(`Foto identificada: ${foundItems.slice(0, 2).join(" • ")}`);
        } else {
          setScanSuccessMsg(null);
        }
      }
    } catch (err) {
      console.warn("Falha no escaneamento automático da foto:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("402") || msg.toLowerCase().includes("crédito")) {
        setError("Seus créditos de IA no Lovable estão esgotados no momento.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido (JPG, PNG, WebP).");
      return;
    }
    try {
      const compressed = await fileToCompressedDataUrl(file);
      setPhoto(compressed);
      setError(null);
      void scanImage(compressed);
    } catch {
      setError("Não foi possível ler a imagem. Tente outro arquivo.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    setScanSuccessMsg(null);
    setCachedIdentificacao(null);
  };

  const currentEffectiveKitQty = isCustomKit
    ? Math.max(1, parseInt(customKitVal || "1", 10))
    : kitQuantity;

  const submit = () => {
    if (!photo) return setError("Envie uma foto do produto ou embalagem.");
    if (!basicName.trim())
      return setError("Informe o nome do produto para orientar a geração.");
    setError(null);
    onSubmit({
      photoDataUrl: photo,
      basicName: basicName.trim(),
      kitQuantity: currentEffectiveKitQty,
      ...optional,
      ...(cachedIdentificacao ? { cachedIdentificacao } : {}),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
      className="mx-auto w-full max-w-xl"
    >
      {/* Card Principal iOS 18 Frosted Glass */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-4 shadow-xl backdrop-blur-2xl sm:p-7">
        {/* Cabeçalho Limpo e Direto */}
        <div className="border-b border-border/50 pb-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>Criação de Anúncios</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Novo Anúncio
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Envie a foto e informe o produto para gerar título, imagens, SKU, NCM, EAN e descrição completa.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          {/* Passo 1: Foto com Leitor Automático */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                1. Foto da Embalagem / Produto
              </Label>
              <span className="text-[11px] font-medium text-muted-foreground">Obrigatório</span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />

            <AnimatePresence mode="wait">
              {photo ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                  className="group relative overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-inner"
                >
                  <div className="flex items-center justify-center p-3 sm:p-4">
                    <img
                      src={photo}
                      alt="Foto do produto"
                      className="max-h-56 w-auto rounded-xl object-contain shadow-md"
                    />
                  </div>

                  {/* Banner de Status do Scanner */}
                  {isScanning && (
                    <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-blue-600/90 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Lendo rótulo e embalagem com IA...</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">Foto enviada</span>
                      {cachedIdentificacao && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-xs">
                          <CheckCircle2 className="size-3" />
                          Lido com sucesso
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
                    >
                      <X className="size-3.5" />
                      Trocar foto
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="dropzone"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  whileTap={{ scale: 0.98 }}
                  className={`group flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    isDragging
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-border/80 bg-muted/15 hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs transition-transform group-hover:scale-110">
                    <Camera className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Toque para enviar ou tirar foto
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      A IA lê a embalagem e adianta as informações para você
                    </p>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Aviso visual do auto-reconhecimento */}
            {scanSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
              >
                <Wand2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{scanSuccessMsg}</span>
              </motion.div>
            )}
          </div>

          {/* Passo 2: Nome do Produto (Sem Presets, com placeholder discreto) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label
                htmlFor="basicName"
                className="text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                2. Nome do Produto
              </Label>
              <span className="text-[11px] font-medium text-muted-foreground">Obrigatório</span>
            </div>
            <Input
              id="basicName"
              value={basicName}
              placeholder="Ex: Garrafa térmica inox 1L preta"
              onChange={(e) => setBasicName(e.target.value)}
              className="h-11 rounded-xl bg-background/80 px-3.5 text-sm font-medium shadow-inner transition-colors focus:border-primary"
            />
          </div>

          {/* Passo 3: Formato de Venda (Avulso ou Kit) */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="size-4 text-primary" />
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  3. Formato de Venda
                </Label>
              </div>
              <Badge
                variant={currentEffectiveKitQty > 1 ? "default" : "secondary"}
                className={`text-[10px] font-bold ${
                  currentEffectiveKitQty > 1
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                {currentEffectiveKitQty > 1
                  ? `Kit ${currentEffectiveKitQty}x Unidades`
                  : "1 Unidade (Avulso)"}
              </Badge>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Para kits, a IA multiplica automaticamente no título, fotos agrupadas, descrição e SKU!
            </p>

            {/* Pílulas de Seleção Rápida */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { qty: 1, label: "1 Unidade" },
                { qty: 2, label: "Kit 2x" },
                { qty: 3, label: "Kit 3x" },
                { qty: 4, label: "Kit 4x" },
                { qty: 5, label: "Kit 5x" },
                { qty: 6, label: "Kit 6x" },
                { qty: 10, label: "Kit 10x" },
                { qty: 12, label: "Kit 12x" },
              ].map((k) => {
                const isSelected = !isCustomKit && kitQuantity === k.qty;
                return (
                  <button
                    key={k.qty}
                    type="button"
                    onClick={() => {
                      setIsCustomKit(false);
                      setKitQuantity(k.qty);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {k.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setIsCustomKit(true);
                  if (!customKitVal) setCustomKitVal("8");
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  isCustomKit
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "border border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                Outra Qtd...
              </button>
            </div>

            {/* Input para Quantidade Personalizada de Kit */}
            <AnimatePresence>
              {isCustomKit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center gap-2 overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-2.5"
                >
                  <span className="text-xs font-medium text-foreground">
                    Qtd no Kit:
                  </span>
                  <Input
                    type="number"
                    min={2}
                    max={1000}
                    value={customKitVal}
                    onChange={(e) => setCustomKitVal(e.target.value)}
                    placeholder="Ex: 8, 20"
                    className="h-8 w-20 rounded-lg bg-background text-center font-mono text-xs font-bold"
                  />
                  <span className="text-xs text-muted-foreground">unidades</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Opcionais Sanfonados Compactos */}
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <PackagePlus className="size-4 text-primary" />
                <span>Dados Opcionais / Complementares</span>
                {Object.values(optional).filter(Boolean).length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {Object.values(optional).filter(Boolean).length} preenchidos
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform duration-200 ${
                  showOptional ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showOptional && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                  className="border-t border-border/60 p-3.5"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="brand" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Marca do Produto
                      </Label>
                      <Input
                        id="brand"
                        placeholder="Ex: Stanley, Tramontina, Yoki"
                        value={optional["brand"] ?? ""}
                        onChange={(e) => setField("brand", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Categoria
                      </Label>
                      <Input
                        id="category"
                        placeholder="Ex: Utilidades Domésticas, Bebidas"
                        value={optional["category"] ?? ""}
                        onChange={(e) => setField("category", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <Label htmlFor="ean" className="text-xs font-medium text-muted-foreground">
                          Código de Barras EAN-13
                        </Label>
                        <button
                          type="button"
                          onClick={() => setField("ean", generateValidEan13("789"))}
                          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                        >
                          <Zap className="size-3" />
                          Gerar EAN
                        </button>
                      </div>
                      <Input
                        id="ean"
                        placeholder="789... ou clique em Gerar"
                        value={optional["ean"] ?? ""}
                        onChange={(e) => setField("ean", e.target.value)}
                        className="h-9 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ncm" className="mb-1 block text-xs font-medium text-muted-foreground">
                        NCM (Classificação Fiscal)
                      </Label>
                      <Input
                        id="ncm"
                        placeholder="Ex: 9617.00.10 ou deixe em branco"
                        value={optional["ncm"] ?? ""}
                        onChange={(e) => setField("ncm", e.target.value)}
                        className="h-9 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Peso / Volume
                      </Label>
                      <Input
                        id="weight"
                        placeholder="Ex: 1L, 500g, 100un"
                        value={optional["weight"] ?? ""}
                        onChange={(e) => setField("weight", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cost" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Custo de Compra (R$)
                      </Label>
                      <Input
                        id="cost"
                        placeholder="R$ 0,00"
                        value={optional["cost"] ?? ""}
                        onChange={(e) => setField("cost", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="other" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Observações Especiais
                      </Label>
                      <Textarea
                        id="other"
                        rows={2}
                        placeholder="Ex: Acompanha tampa extra, garantia de 5 anos..."
                        value={optional["other"] ?? ""}
                        onChange={(e) => setField("other", e.target.value)}
                        className="rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              {error}
            </motion.div>
          )}

          {/* Botão de Ação Principal iOS */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              disabled={isScanning}
              className="h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60"
              onClick={submit}
            >
              {isScanning ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <Sparkles className="size-4.5" />
              )}
              <span>
                {isScanning ? "Identificando Imagem..." : "Gerar Anúncio Profissional"}
              </span>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

