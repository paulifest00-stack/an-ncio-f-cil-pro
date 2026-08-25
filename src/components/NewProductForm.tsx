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
  { label: "Paçoca Rolha 100un", name: "Paçoca Rolha 100un 1kg", brand: "Yoki" },
  { label: "Balão Látex 9 Pol", name: "Balão Látex Liso 9 Polegadas 50un", brand: "Pic Pic" },
  { label: "Luva Nitrílica Preta", name: "Luva Nitrílica Sem Pó Preta Caixa 100un", brand: "Bompack" },
  { label: "Tinta Spray Cabelo", name: "Tinta Pinta Cabelo Temporária 150ml", brand: "Popper" },
  { label: "Pote Retangular 24un", name: "Pote Retangular 24un", brand: "Gour Max" },
];
const scanCache = new Map<string, any>();

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

  const applyScanResult = (res: any) => {
    if (res && res.sugestoes) {
      const { basicName: autoName, brand, category, weight, packaging, ean } = res.sugestoes;
      if (autoName) {
        setBasicName(autoName);
      }
      setOptional((prev) => ({
        ...prev,
        ...(brand ? { brand } : {}),
        ...(category ? { category } : {}),
        ...(weight ? { weight } : {}),
        ...(packaging ? { packaging } : {}),
        ...(ean ? { ean } : {}),
      }));

      if (res.identificacao) {
        setCachedIdentificacao(res.identificacao);
        const foundItems = [
          res.identificacao.marca && `Marca: ${res.identificacao.marca}`,
          res.identificacao.volume && `Volume: ${res.identificacao.volume}`,
          res.identificacao.linha && `Linha: ${res.identificacao.linha}`,
        ].filter(Boolean);

        setScanSuccessMsg(
          foundItems.length > 0
            ? `Identificado: ${foundItems.join(" · ")}`
            : "Campos preenchidos a partir da foto!",
        );
        
        if (brand || weight || category || ean) {
          setShowOptional(true);
        }
      }
    }
  };

  const scanImage = async (compressedDataUrl: string) => {
    const cacheKey = `${compressedDataUrl.slice(0, 80)}_${compressedDataUrl.length}`;
    if (scanCache.has(cacheKey)) {
      applyScanResult(scanCache.get(cacheKey));
      return;
    }

    setIsScanning(true);
    setScanSuccessMsg(null);
    try {
      const res = await quickScanPhoto({
        data: { photoDataUrl: compressedDataUrl },
      });
      if (res) {
        scanCache.set(cacheKey, res);
        applyScanResult(res);
      }
    } catch (err) {
      console.warn("Falha no escaneamento automático da foto:", err);
      // Não bloqueia o usuário caso o scan rápido falhe
    } finally {
      setIsScanning(false);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).");
      return;
    }
    try {
      const compressed = await fileToCompressedDataUrl(file);
      setPhoto(compressed);
      setError(null);
      // Executa o escaneamento inteligente automático da foto
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
    if (!photo) return setError("Envie uma foto da embalagem ou produto.");
    if (!basicName.trim())
      return setError("Informe o nome básico do produto para orientar a IA.");
    setError(null);
    onSubmit({
      photoDataUrl: photo,
      basicName: basicName.trim(),
      kitQuantity: currentEffectiveKitQty,
      ...optional,
      ...(cachedIdentificacao ? { cachedIdentificacao } : {}),
    });
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setBasicName(preset.name);
    setField("brand", preset.brand);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.45, bounce: 0 }}
      className="mx-auto w-full max-w-2xl"
    >
      {/* Container Principal Estilo E-commerce (ML/Bling) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded bg-primary/10 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>Gerador Inteligente & Auto-OCR</span>
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Criar Novo Anúncio
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie a foto do produto. A IA lê o rótulo, preenche o formulário e gera o anúncio completo.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Campo 1: Foto com Dropzone Tátil iOS & Auto-Scan */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                1. Foto do Produto / Embalagem
              </Label>
              <span className="text-[11px] text-muted-foreground">Obrigatório</span>
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                  className="group relative overflow-hidden rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex items-center justify-center p-6">
                    <img
                      src={photo}
                      alt="Pré-visualização do produto"
                      className="max-h-64 w-auto rounded object-contain shadow-sm"
                    />
                  </div>

                  {/* Banner de Status de Escaneamento */}
                  {isScanning && (
                    <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Identificando embalagem...</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 p-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Foto Carregada</span>
                      {cachedIdentificacao && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                          <CheckCircle2 className="size-3" />
                          Auto-identificado
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="flex items-center gap-1.5 rounded bg-white/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/30"
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
                  className={`group flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-border bg-muted/10 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform group-hover:scale-110">
                    <Camera className="size-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Clique ou arraste a foto aqui
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      A IA lê a embalagem e preenche os campos automaticamente
                    </p>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Aviso visual de sucesso do auto-reconhecimento */}
            {scanSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2.5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
              >
                <Wand2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{scanSuccessMsg}</span>
              </motion.div>
            )}
          </div>

          {/* Campo 2: Nome Básico com Presets Rápidos */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <Label
                htmlFor="basicName"
                className="text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                2. Nome Básico do Produto
              </Label>
              <span className="text-[11px] text-muted-foreground">Obrigatório</span>
            </div>
            <Input
              id="basicName"
              value={basicName}
              placeholder="Ex.: Paçoca rolha 1kg ou Balão látex 9 polegadas"
              onChange={(e) => setBasicName(e.target.value)}
              className="h-11 rounded-lg border-border bg-background px-3 text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            {/* Presets Rápidos */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sugestões:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded border border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formato de Venda (Discreto e Minimalista) */}
          <div className="rounded-lg border border-border bg-muted/10 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Layers className="size-4 text-blue-600" />
                <span>Formato de Venda:</span>
                {currentEffectiveKitQty > 1 ? (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                    Kit {currentEffectiveKitQty}x
                  </span>
                ) : (
                  <span className="text-xs font-normal text-muted-foreground">
                    Avulso
                  </span>
                )}
              </div>

              {/* Pílulas Compactas */}
              <div className="flex items-center gap-1">
                {[
                  { qty: 1, label: "1 Un" },
                  { qty: 2, label: "2x" },
                  { qty: 3, label: "3x" },
                  { qty: 5, label: "5x" },
                  { qty: 10, label: "10x" },
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
                      className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-background text-muted-foreground border border-border hover:border-blue-400 hover:text-foreground"
                      }`}
                    >
                      {k.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomKit(!isCustomKit);
                    if (!customKitVal) setCustomKitVal("8");
                  }}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    isCustomKit
                      ? "bg-blue-600 text-white"
                      : "bg-background text-muted-foreground border border-border hover:border-blue-400 hover:text-foreground"
                  }`}
                  title="Definir outra quantidade de kit"
                >
                  {isCustomKit && customKitVal ? `${customKitVal}x` : "Outro..."}
                </button>
              </div>
            </div>

            {/* Input discreto apenas se selecionou 'Outro' */}
            <AnimatePresence>
              {isCustomKit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex items-center justify-end gap-2 pt-1 border-t border-border/40"
                >
                  <span className="text-[11px] text-muted-foreground">Qtd exata:</span>
                  <Input
                    type="number"
                    min={2}
                    max={1000}
                    value={customKitVal}
                    onChange={(e) => setCustomKitVal(e.target.value)}
                    placeholder="Ex: 8"
                    className="h-8 w-20 rounded bg-background text-center font-mono text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">unidades</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Campo 4: Opcionais Estilo E-commerce */}
          <div className="overflow-hidden rounded-lg border border-border bg-muted/10">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/20"
            >
              <div className="flex items-center gap-2">
                <PackagePlus className="size-4 text-blue-600" />
                <span>Ficha Técnica Opcional</span>
                {Object.values(optional).filter(Boolean).length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-blue-100 text-blue-700">
                    {Object.values(optional).filter(Boolean).length}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform duration-300 ${
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
                  transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                  className="border-t border-border/60 p-4"
                >
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="brand" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Marca do Produto
                      </Label>
                      <Input
                        id="brand"
                        placeholder="Ex: Popper, Bompack, Yoki"
                        value={optional["brand"] ?? ""}
                        onChange={(e) => setField("brand", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Categoria
                      </Label>
                      <Input
                        id="category"
                        placeholder="Ex: Artigos para Festas, Alimentos"
                        value={optional["category"] ?? ""}
                        onChange={(e) => setField("category", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label htmlFor="ean" className="text-xs font-medium text-muted-foreground">
                          Código de Barras / EAN-13
                        </Label>
                        <button
                          type="button"
                          onClick={() => setField("ean", generateValidEan13("789"))}
                          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                        >
                          <Zap className="size-3" />
                          Gerar EAN-13
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
                      <Label htmlFor="ncm" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        NCM (Classificação Fiscal)
                      </Label>
                      <Input
                        id="ncm"
                        placeholder="Ex: 1905.90.90 ou deixe para a IA pesquisar"
                        value={optional["ncm"] ?? ""}
                        onChange={(e) => setField("ncm", e.target.value)}
                        className="h-9 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Peso / Medida / Volume
                      </Label>
                      <Input
                        id="weight"
                        placeholder="Ex: 150ml, 1kg, 100un"
                        value={optional["weight"] ?? ""}
                        onChange={(e) => setField("weight", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cost" className="mb-1.5 block text-xs font-medium text-muted-foreground">
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
                    <div>
                      <Label htmlFor="packaging" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Tipo de Embalagem
                      </Label>
                      <Input
                        id="packaging"
                        placeholder="Ex: Lata aerossol, Pacote plástico"
                        value={optional["packaging"] ?? ""}
                        onChange={(e) => setField("packaging", e.target.value)}
                        className="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="other" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Observações Especiais ou Detalhes
                      </Label>
                      <Textarea
                        id="other"
                        rows={2}
                        placeholder="Ex: Contém 10 pacotes de 100g, validade 12 meses..."
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

          {/* Erro se houver */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              {error}
            </motion.div>
          )}

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              disabled={isScanning}
              className="h-12 w-full gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
              onClick={submit}
            >
              {isScanning ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
              <span>
                {isScanning ? "Lendo embalagem..." : "Gerar Anúncio Completo"}
              </span>
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Info className="size-3.5 text-primary" />
        <span>Geração inteligente e econômica: reutiliza a leitura visual para não duplicar créditos.</span>
      </div>
    </motion.div>
  );
}

