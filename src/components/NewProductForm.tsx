import { useRef, useState } from "react";
import { ChevronDown, ImagePlus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ProductInput } from "@/lib/ai/types";

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
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function NewProductForm({ onSubmit }: { onSubmit: (input: ProductInput) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [basicName, setBasicName] = useState("");
  const [optional, setOptional] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = (key: string, value: string) =>
    setOptional((prev) => ({ ...prev, [key]: value }));

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await fileToCompressedDataUrl(file));
      setError(null);
    } catch {
      setError("Não foi possível ler essa imagem. Tente outro arquivo.");
    }
  };

  const submit = () => {
    if (!photo) return setError("Envie uma foto do produto.");
    if (!basicName.trim()) return setError("Informe o nome básico do produto.");
    setError(null);
    onSubmit({ photoDataUrl: photo, basicName: basicName.trim(), ...optional });
  };

  const optionalFields: [string, string, string?][] = [
    ["brand", "Marca"],
    ["ean", "Código de barras / EAN"],
    ["category", "Categoria"],
    ["cost", "Custo do produto"],
    ["weight", "Peso"],
    ["dimensions", "Dimensões"],
    ["units", "Quantidade de unidades"],
    ["packaging", "Informações da embalagem"],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Novo produto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie a foto e o nome básico. O restante é opcional.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <Label className="mb-2 block">Foto do produto</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {photo ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted">
                <img src={photo} alt="Pré-visualização do produto" className="mx-auto max-h-72 object-contain" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2"
                  onClick={() => setPhoto(null)}
                  aria-label="Remover foto"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <ImagePlus className="size-6" />
                Clique para enviar a foto
              </button>
            )}
          </div>

          <div>
            <Label htmlFor="basicName" className="mb-2 block">
              Nome básico do produto
            </Label>
            <Input
              id="basicName"
              value={basicName}
              placeholder="Ex.: Paçoca rolha 1kg"
              onChange={(e) => setBasicName(e.target.value)}
            />
          </div>

          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium">
              Adicionar informações
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 pt-4 sm:grid-cols-2">
              {optionalFields.map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={key} className="mb-2 block text-xs text-muted-foreground">
                    {label}
                  </Label>
                  <Input
                    id={key}
                    value={optional[key] ?? ""}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Label htmlFor="other" className="mb-2 block text-xs text-muted-foreground">
                  Outras informações
                </Label>
                <Textarea
                  id="other"
                  rows={3}
                  value={optional["other"] ?? ""}
                  onChange={(e) => setField("other", e.target.value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button size="lg" className="w-full" onClick={submit}>
            <Sparkles />
            Gerar produto
          </Button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Precisão acima de completude: o que não for confirmado aparece como “Não identificado”.
      </p>
    </div>
  );
}
