import { useState, useEffect } from "react";
import { History, Trash2, ArrowRight, Package, Clock, ExternalLink } from "lucide-react";
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

const RECENT_KEY = "anuncio_facil_recent_products";
const MAX_ITEMS = 20;

export interface SavedProduct {
  id: string;
  createdAt: number;
  input: ProductInput;
  listing: Listing;
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
  try {
    const items = getSavedProducts();
    const existingIdx = items.findIndex((i) => i.input.basicName === input.basicName);
    const newItem: SavedProduct = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      input,
      listing,
    };
    let updated = [newItem, ...items.filter((_, idx) => idx !== existingIdx)];
    if (updated.length > MAX_ITEMS) {
      updated = updated.slice(0, MAX_ITEMS);
    }
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function removeSavedProduct(id: string) {
  if (typeof window === "undefined") return;
  try {
    const items = getSavedProducts().filter((i) => i.id !== id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function clearSavedProducts() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_KEY);
}

interface RecentListingsProps {
  onSelect: (item: SavedProduct) => void;
}

export function RecentListings({ onSelect }: RecentListingsProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedProduct[]>([]);

  const refresh = () => setItems(getSavedProducts());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSavedProduct(id);
    refresh();
    toast.success("Produto removido do histórico.");
  };

  const handleClearAll = () => {
    clearSavedProducts();
    refresh();
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
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <History className="size-3.5" />
          <span>Histórico</span>
          {items.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {items.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base font-semibold">
              <Package className="size-4 text-primary" />
              Produtos Recentes
            </SheetTitle>
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
            Seus anúncios gerados ficam salvos localmente para acesso rápido sem novo processamento.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Package className="size-10 stroke-1 mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhum produto salvo ainda</p>
              <p className="text-xs mt-1 max-w-[200px]">
                Os produtos que você gerar aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <img
                  src={item.input.photoDataUrl}
                  alt={item.input.basicName}
                  className="size-12 rounded-lg border border-border object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                    {item.listing.nomeInterno || item.input.basicName}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {item.listing.sku}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(item.id, e)}
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
