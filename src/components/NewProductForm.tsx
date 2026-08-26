import { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Layers,
  Loader2,
  PackagePlus,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { quickScanPhoto } from "@/lib/ai/product.functions";
import { getUserApiKeys } from "@/lib/ai/user-keys";
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

export function NewProductForm({
  onSubmit,
}: {
  onSubmit: (input: ProductInput) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [basicName, setBasicName] = useState("");
  const [isKitMode, setIsKitMode] = useState(false);
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

  // 1. Restaura Rascunho do Cache Local ao Carregar (0ms)
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem("market_ai_form_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.basicName) setBasicName(parsed.basicName);
        if (parsed.photo) setPhoto(parsed.photo);
        if (parsed.isKitMode) setIsKitMode(parsed.isKitMode);
        if (parsed.kitQuantity) setKitQuantity(parsed.kitQuantity);
        if (parsed.optional) setOptional(parsed.optional);
        if (parsed.cachedIdentificacao) setCachedIdentificacao(parsed.cachedIdentificacao);
      }
    } catch {
      // ignore
    }
  }, []);

  // 2. Salva Rascunho no Cache Local em Background
  useEffect(() => {
    try {
      if (basicName || photo || Object.keys(optional).length > 0) {
        sessionStorage.setItem(
          "market_ai_form_draft",
          JSON.stringify({
            basicName,
            photo,
            isKitMode,
            kitQuantity,
            optional,
            cachedIdentificacao,
          }),
        );
      }
    } catch {
      // ignore
    }
  }, [basicName, photo, isKitMode, kitQuantity, optional, cachedIdentificacao]);

  const setField = (key: string, value: string) =>
    setOptional((prev) => ({ ...prev, [key]: value }));

  const getPhotoSignature = (dataUrl: string) => {
    return `photo_${dataUrl.length}_${dataUrl.slice(30, 90)}_${dataUrl.slice(-60)}`;
  };

  const scanImage = async (compressedDataUrl: string) => {
    const photoKey = getPhotoSignature(compressedDataUrl);

    // Verifica Cache Local do Scanner (0ms)
    try {
      const rawCache = localStorage.getItem("market_ai_scan_cache_v1");
      if (rawCache) {
        const scanCache = JSON.parse(rawCache);
        if (scanCache[photoKey]) {
          const cached = scanCache[photoKey];
          if (cached.identificacao) setCachedIdentificacao(cached.identificacao);
          if (cached.sugestoes) {
            if (cached.sugestoes.basicName && !basicName) setBasicName(cached.sugestoes.basicName);
            if (cached.sugestoes.brand) setField("brand", cached.sugestoes.brand);
            if (cached.sugestoes.category) setField("category", cached.sugestoes.category);
            if (cached.sugestoes.weight) setField("weight", cached.sugestoes.weight);
            if (cached.sugestoes.ean) setField("ean", cached.sugestoes.ean);
          }
          setScanSuccessMsg("Carregado instantaneamente do cache local.");
          return;
        }
      }
    } catch {
      // fallback
    }

    setIsScanning(true);
    setScanSuccessMsg(null);
    try {
      const res = (await quickScanPhoto({
        data: { 
          photoDataUrl: compressedDataUrl,
          customKeys: getUserApiKeys(),
        },
      })) as {
        identificacao?: Identificacao;
        sugestoes?: {
          basicName?: string;
          brand?: string;
          category?: string;
          weight?: string;
          ean?: string;
        };
        error?: string;
        status?: "ok" | "sem_creditos" | "error";
      };

      if (res) {
        if (res.status === "sem_creditos" || res.error?.includes("Créditos") || res.error?.includes("402")) {
          setScanSuccessMsg("Foto pronta. Digite o nome do produto abaixo.");
          setError(null);
          return;
        }

        if (res.identificacao) {
          setCachedIdentificacao(res.identificacao);
        }

        if (res.sugestoes) {
          const sug = res.sugestoes;
          if (sug.basicName && !basicName) {
            setBasicName(sug.basicName);
          }
          if (sug.brand) setField("brand", sug.brand);
          if (sug.category) setField("category", sug.category);
          if (sug.weight) setField("weight", sug.weight);
          if (sug.ean) setField("ean", sug.ean);
          
          setScanSuccessMsg(sug.basicName ? `Detectado: ${sug.basicName}` : "Rótulo identificado com sucesso.");
        }

        // Grava no Cache Local do Scanner
        try {
          const rawCache = localStorage.getItem("market_ai_scan_cache_v1");
          const scanCache = rawCache ? JSON.parse(rawCache) : {};
          scanCache[photoKey] = {
            identificacao: res.identificacao,
            sugestoes: res.sugestoes,
          };
          localStorage.setItem("market_ai_scan_cache_v1", JSON.stringify(scanCache));
        } catch {
          // ignore
        }
      }
    } catch {
      // fallback silencioso para não poluir
    } finally {
      setIsScanning(false);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const compressed = await fileToCompressedDataUrl(file);
      setPhoto(compressed);
      void scanImage(compressed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar foto.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const clearPhoto = () => {
    setPhoto(null);
    setCachedIdentificacao(null);
    setScanSuccessMsg(null);
    if (fileRef.current) fileRef.current.value = "";
    try {
      sessionStorage.removeItem("market_ai_form_draft");
    } catch {
      // ignore
    }
  };

  const currentEffectiveKitQty = isKitMode
    ? isCustomKit
      ? Math.max(2, parseInt(customKitVal || "2", 10) || 2)
      : kitQuantity > 1
        ? kitQuantity
        : 2
    : 1;

  const submit = () => {
    if (!photo) return setError("Envie a foto do produto.");
    if (!basicName.trim())
      return setError("Informe o nome do produto.");
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      className="mx-auto w-full max-w-lg"
    >
      <div className="rounded-3xl border border-border/80 bg-card/95 p-4 sm:p-6 shadow-xl backdrop-blur-2xl space-y-4">
        <div>
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-muted/10"
              >
                <div className="flex items-center justify-center p-3">
                  <img
                    src={photo}
                    alt="Produto"
                    className="max-h-48 w-auto rounded-xl object-contain shadow-xs"
                  />
                </div>

                {isScanning && (
                  <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-1.5 bg-primary/90 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Lendo embalagem...</span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2.5 text-white">
                  <div className="flex items-center gap-1.5">
                    {cachedIdentificacao ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                        <CheckCircle2 className="size-3" />
                        Identificado
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-white/80">Foto carregada</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="rounded-lg bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur-md hover:bg-white/30"
                  >
                    Trocar
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
                className={`group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border/80 bg-muted/10 hover:border-primary/40 hover:bg-muted/20"
                }`}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Camera className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Enviar ou Tirar Foto do Produto
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Clique ou arraste a imagem aqui
                  </p>
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {scanSuccessMsg && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Wand2 className="size-3 shrink-0" />
              <span className="truncate">{scanSuccessMsg}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="basicName" className="text-xs font-bold text-foreground">
            Nome do Produto
          </Label>
          <Input
            id="basicName"
            value={basicName}
            placeholder="Ex: Garrafa térmica inox 1L preta"
            onChange={(e) => setBasicName(e.target.value)}
            className="h-10 rounded-xl bg-background text-xs font-medium"
          />
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              Formato de Venda
            </span>

            <div className="flex items-center rounded-xl bg-background border border-border/80 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsKitMode(false);
                  setKitQuantity(1);
                  setIsCustomKit(false);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  !isKitMode
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                1 Unidade
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsKitMode(true);
                  if (kitQuantity <= 1) setKitQuantity(2);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  isKitMode
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Kit Multi {isKitMode ? `(${currentEffectiveKitQty}x)` : "▾"}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isKitMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pt-1.5 border-t border-border/60"
              >
                <div className="flex flex-wrap gap-1 items-center">
                  {[2, 3, 4, 5, 6, 10, 12].map((qty) => {
                    const isSelected = !isCustomKit && kitQuantity === qty;
                    return (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          setIsCustomKit(false);
                          setKitQuantity(qty);
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
                          isSelected
                            ? "bg-primary text-white shadow-xs"
                            : "bg-background border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {qty}x
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomKit(true);
                      if (!customKitVal) setCustomKitVal("8");
                    }}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                      isCustomKit
                        ? "bg-primary text-white shadow-xs"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Outro
                  </button>

                  {isCustomKit && (
                    <Input
                      type="number"
                      min={2}
                      max={999}
                      value={customKitVal}
                      onChange={(e) => setCustomKitVal(e.target.value)}
                      placeholder="Qtd"
                      className="h-7 w-14 rounded-lg bg-background text-center text-xs font-bold"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex w-full items-center justify-between p-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <PackagePlus className="size-3.5" />
              <span>Campos Opcionais (Marca, NCM, EAN)</span>
              {Object.values(optional).filter(Boolean).length > 0 && (
                <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                  {Object.values(optional).filter(Boolean).length}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
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
                className="border-t border-border/60 p-3 space-y-2.5"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Marca</Label>
                    <Input
                      placeholder="Ex: Tramontina"
                      value={optional["brand"] ?? ""}
                      onChange={(e) => setField("brand", e.target.value)}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Categoria</Label>
                    <Input
                      placeholder="Ex: Cozinha"
                      value={optional["category"] ?? ""}
                      onChange={(e) => setField("category", e.target.value)}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-semibold text-muted-foreground">EAN-13</Label>
                      <button
                        type="button"
                        onClick={() => setField("ean", generateValidEan13("789"))}
                        className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Zap className="size-2.5" /> Gerar
                      </button>
                    </div>
                    <Input
                      placeholder="789..."
                      value={optional["ean"] ?? ""}
                      onChange={(e) => setField("ean", e.target.value)}
                      className="h-8 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">NCM Oficial</Label>
                    <Input
                      placeholder="Ex: 9617.00.10"
                      value={optional["ncm"] ?? ""}
                      onChange={(e) => setField("ncm", e.target.value)}
                      className="h-8 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Peso/Vol</Label>
                    <Input
                      placeholder="Ex: 1kg, 500ml"
                      value={optional["weight"] ?? ""}
                      onChange={(e) => setField("weight", e.target.value)}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Custo (R$)</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={optional["cost"] ?? ""}
                      onChange={(e) => setField("cost", e.target.value)}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <Button
          size="lg"
          disabled={isScanning}
          onClick={submit}
          className="h-11 w-full gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md transition-all active:scale-98"
        >
          {isScanning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          <span>{isScanning ? "Lendo Imagem..." : "Gerar Anúncio Profissional"}</span>
        </Button>
      </div>
    </motion.div>
  );
}
