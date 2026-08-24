import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Info,
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
      const res = await quickScanPhoto({
        data: { photoDataUrl: compressedDataUrl },
      });

      if (res && res.sugestoes) {
        const { basicName: autoName, brand, category, weight, packaging, ean } = res.sugestoes;
        
        // Preenche o nome básico se não foi preenchido manualmente
        if (autoName) {
          setBasicName(autoName);
        }

        // Preenche campos opcionais identificados
        setOptional((prev) => ({
          ...prev,
          ...(brand ? { brand } : {}),
          ...(category ? { category } : {}),
          ...(weight ? { weight } : {}),
          ...(packaging ? { packaging } : {}),
          ...(ean ? { ean } : {}),
        }));

        // Guarda a identificação para reutilizar na geração completa sem repetir a etapa
        if (res.identificacao) {
          setCachedIdentificacao(res.identificacao);
        }

        if (autoName || brand) {
          setScanSuccessMsg(
            `Produto identificado: ${autoName || "Item lido"} ${brand ? `(Marca: ${brand})` : ""}`,
          );
          // Se encontrou dados extras, abre a sanfona de opcionais para o usuário conferir
          if (brand || weight || category || ean) {
            setShowOptional(true);
          }
        }
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

  const submit = () => {
    if (!photo) return setError("Envie uma foto da embalagem ou produto.");
    if (!basicName.trim())
      return setError("Informe o nome básico do produto para orientar a IA.");
    setError(null);
    onSubmit({
      photoDataUrl: photo,
      basicName: basicName.trim(),
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
      {/* Container Principal Estilo iOS Grouped Card */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl backdrop-blur-2xl sm:p-8">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>Gerador Inteligente & Auto-OCR</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Criar Novo Anúncio
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
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
                  className="group relative overflow-hidden rounded-2xl border border-border/80 bg-muted/30 shadow-inner"
                >
                  <div className="flex items-center justify-center p-4">
                    <img
                      src={photo}
                      alt="Pré-visualização do produto"
                      className="max-h-64 w-auto rounded-xl object-contain shadow-md"
                    />
                  </div>

                  {/* Banner de Status de Escaneamento */}
                  {isScanning && (
                    <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-blue-600/90 py-2 text-xs font-semibold text-white backdrop-blur-md">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Identificando texto e marca na embalagem com IA...</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Foto Carregada</span>
                      {cachedIdentificacao && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-xs">
                          <CheckCircle2 className="size-3" />
                          Auto-identificado
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
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
                  className={`group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    isDragging
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs transition-transform group-hover:scale-110">
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
              className="h-12 rounded-xl bg-background/80 px-4 text-sm font-medium shadow-inner transition-colors focus:border-primary"
            />

            {/* Presets Rápidos */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Exemplos rápidos:
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 3: Opcionais Sanfonados no estilo iOS */}
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <PackagePlus className="size-4 text-primary" />
                <span>Informações Adicionais (Opcional / Auto-preenchidas)</span>
                {Object.values(optional).filter(Boolean).length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {Object.values(optional).filter(Boolean).length} preenchidos
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
                      <Label htmlFor="ean" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Código de Barras / EAN
                      </Label>
                      <Input
                        id="ean"
                        placeholder="789..."
                        value={optional["ean"] ?? ""}
                        onChange={(e) => setField("ean", e.target.value)}
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

          {/* Botão de Ação Principal iOS */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              disabled={isScanning}
              className="h-13 w-full gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/35 disabled:opacity-60"
              onClick={submit}
            >
              {isScanning ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
              <span>
                {isScanning ? "Identificando Foto..." : "Gerar Anúncio Profissional"}
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

