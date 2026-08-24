import { useState, useEffect } from "react";
import {
  History,
  Trash2,
  ArrowRight,
  Package,
  Clock,
  Cloud,
  Database,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Listing, ProductInput } from "@/lib/ai/types";
import {
  deleteListingFromSupabase,
  getRecentListingsFromSupabase,
  saveListingToSupabase,
  type DbListing,
} from "@/lib/supabase";

const RECENT_KEY = "anuncio_facil_recent_products";
const MAX_ITEMS = 30;

export interface SavedProduct {
  id: string;
  createdAt: number;
  input: ProductInput;
  listing: Listing;
  isCloud?: boolean;
}

export function getSavedProducts(): SavedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) return JSON.parse(raw) as SavedProduct[];
  } catch {
    // fallback
  }
  return [];
}

export function saveProductToHistory(input: ProductInput, listing: Listing) {
  if (typeof window === "undefined") return;

  // 1. Salva localmente de forma imediata
  try {
    const items = getSavedProducts();
    const existingIdx = items.findIndex(
      (i) => i.input.basicName === input.basicName && i.listing.sku === listing.sku,
    );
    const newItem: SavedProduct = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      input,
      listing,
      isCloud: true,
    };
    let updated = [newItem, ...items.filter((_, idx) => idx !== existingIdx)];
    if (updated.length > MAX_ITEMS) {
      updated = updated.slice(0, MAX_ITEMS);
    }
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // 2. Salva no Supabase de forma assíncrona em background
  void saveListingToSupabase(listing, input);
}

export function removeSavedProduct(id: string) {
  if (typeof window === "undefined") return;
  try {
    const items = getSavedProducts().filter((i) => i.id !== id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
  void deleteListingFromSupabase(id);
}

export function clearSavedProducts() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_KEY);
}

interface RecentListingsProps {
  onSelect: (item: { input: ProductInput; listing: Listing }) => void;
}

export function RecentListings({ onSelect }: RecentListingsProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    // 1. Carrega local primeiro (instantâneo)
    const local = getSavedProducts();
    setItems(local);

    // 2. Sincroniza com o Supabase
    try {
      const cloudList = await getRecentListingsFromSupabase(MAX_ITEMS);
      if (cloudList && cloudList.length > 0) {
        const mapped: SavedProduct[] = cloudList.map((db: DbListing) => ({
          id: db.id,
          createdAt: new Date(db.created_at).getTime(),
          input: (db.user_input || {
            basicName: db.nome_interno,
            photoDataUrl: db.photo_url || "",
          }) as ProductInput,
          listing: {
            sku: db.sku,
            skuPai: db.sku_pai,
            skuFilho: db.sku_filho,
            variacoesSku: db.variacoes_sku,
            nomeInterno: db.nome_interno,
            tituloMercadoLivre: db.titulo_mercadolivre,
            descricao: db.descricao || "",
            palavrasChave: db.palavras_chave || {
              principais: [],
              relacionadas: [],
              variacoes: [],
            },
            fichaTecnica: db.ficha_tecnica || {},
            caracteristicas: db.caracteristicas || [],
            alertas: db.alertas || [],
            resumo: db.resumo || "",
            imagens: db.imagens || [],
            identificacao: db.identificacao,
            referencias: db.referencias,
          },
          isCloud: true,
        }));
        setItems(mapped);
      }
    } catch {
      // mantém os locais se falhar a rede
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadAll();
    }
  }, [open]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSavedProduct(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Produto removido.");
  };

  const handleClearAll = () => {
    clearSavedProducts();
    setItems([]);
    toast.success("Histórico limpo.");
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl text-xs font-medium border-border/80 bg-card hover:border-primary/40 hover:bg-accent/40"
          title="Ver todos os seus anúncios salvos"
        >
          <History className="size-3.5 text-primary" />
          <span>Meus Anúncios</span>
          {items.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {items.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <SheetTitle className="text-base font-semibold">
                Meus Anúncios Salvos
              </SheetTitle>
            </div>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 text-xs text-destructive hover:bg-destructive/10"
              >
                Limpar tudo
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Clique em qualquer anúncio abaixo para abrir a tela completa com títulos, descrições, ficha técnica e imagens.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 max-h-[calc(100vh-140px)] space-y-3 overflow-y-auto pr-1">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Loader2 className="mb-2 size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Carregando do Supabase...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Package className="mb-2 size-10 opacity-40 stroke-1" />
              <p className="text-sm font-medium">Nenhum anúncio salvo ainda</p>
              <p className="mt-1 max-w-[220px] text-xs">
                Todo anúncio que você gerar será automaticamente salvo no Supabase e listado aqui.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect({ input: item.input, listing: item.listing });
                  setOpen(false);
                }}
                className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-xs"
              >
                {item.input.photoDataUrl ? (
                  <img
                    src={item.input.photoDataUrl}
                    alt={item.input.basicName}
                    className="size-12 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <Package className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                    {item.listing.nomeInterno || item.input.basicName}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
                      {item.listing.sku}
                    </span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="size-3" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive opacity-0 hover:bg-destructive/10 group-hover:opacity-100"
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Excluir"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
