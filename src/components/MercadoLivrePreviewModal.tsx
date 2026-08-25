import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Listing, ProductInput } from "@/lib/ai/types";

interface MercadoLivrePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  input: ProductInput;
}

export function MercadoLivrePreviewModal({
  isOpen,
  onClose,
  listing,
  input,
}: MercadoLivrePreviewModalProps) {
  // Coleta todas as imagens disponíveis (foto do upload + imagens geradas da IA)
  const availableImages = [
    input.photoDataUrl,
    ...(listing.imagens?.map((img) => img.url).filter(Boolean) as string[]),
  ].filter(Boolean);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!isOpen) return null;

  const effectiveKitQty = listing.kitQuantity || input.kitQuantity || 1;
  const isKit = effectiveKitQty > 1;

  // Preço simulado ou baseado no custo
  const rawCost = input.cost ? Number(input.cost.replace(/\D/g, "")) / 100 : null;
  const price = rawCost && rawCost > 0 ? (rawCost * 2.2).toFixed(2) : "59.90";
  const installment = (parseFloat(price) / 12).toFixed(2);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-md">
        {/* Backdrop clickable */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Container Mobile-first */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0 }}
          className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-background shadow-2xl"
        >
          {/* Barra de Topo do Preview Mercado Livre */}
          <div className="flex items-center justify-between border-b border-border/60 bg-[#FFE600] px-4 py-2.5 text-neutral-900">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-900 text-white font-black text-xs">
                ML
              </div>
              <div>
                <span className="text-xs font-black tracking-tight text-neutral-900 uppercase">
                  Prévia do Anúncio
                </span>
                <span className="ml-1 text-[10px] font-semibold text-neutral-700">
                  (Simulação Mercado Livre)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-black/10 text-neutral-900 transition-transform hover:scale-105 active:scale-95"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Conteúdo Rolável da Página do Produto */}
          <div className="no-scrollbar overflow-y-auto p-4 sm:p-6 space-y-5 bg-card/60">
            {/* Status e Avaliação */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Novo | +1000 vendidos</span>
              <div className="flex items-center gap-1 text-amber-500">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="size-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <span className="font-semibold text-foreground text-xs">4.9</span>
                <span className="text-[11px] text-muted-foreground">(342)</span>
              </div>
            </div>

            {/* Título Oficial */}
            <h2 className="text-base font-bold leading-snug text-foreground sm:text-lg">
              {listing.tituloMercadoLivre}
            </h2>

            {/* Galeria de Fotos / Carrossel */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/80 bg-white shadow-inner flex items-center justify-center">
                {availableImages[activeImageIdx] ? (
                  <img
                    src={availableImages[activeImageIdx]}
                    alt="Foto principal do anúncio"
                    className="size-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-xs text-muted-foreground">
                    <span>Sem imagem gerada</span>
                  </div>
                )}

                {/* Badges Flutuantes na Imagem */}
                <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                  {isKit && (
                    <Badge className="bg-blue-600 text-white font-bold text-[10px] shadow-sm">
                      Kit {effectiveKitQty}x Unidades
                    </Badge>
                  )}
                  {listing.identificacao?.layout && (
                    <Badge variant="secondary" className="text-[9px] font-bold">
                      Layout {listing.identificacao.layout}
                    </Badge>
                  )}
                </div>

                {/* Navegação Prev / Next */}
                {availableImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIdx((prev) =>
                          prev === 0 ? availableImages.length - 1 : prev - 1,
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition-transform active:scale-95"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIdx((prev) =>
                          prev === availableImages.length - 1 ? 0 : prev + 1,
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition-transform active:scale-95"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </>
                )}

                {/* Indicador de Quantidade de Fotos */}
                <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                  {activeImageIdx + 1} / {availableImages.length}
                </div>
              </div>

              {/* Thumbnails */}
              {availableImages.length > 1 && (
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                  {availableImages.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative size-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all active:scale-95 ${
                        activeImageIdx === idx
                          ? "border-blue-600 shadow-md ring-2 ring-blue-600/30"
                          : "border-border/70 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={src}
                        alt={`Miniatura ${idx + 1}`}
                        className="size-full object-contain p-0.5"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bloco de Preço & Frete */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-light text-foreground">
                    R$ {price.replace(".", ",")}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    10% OFF no Pix
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  em <strong className="text-foreground">12x R$ {installment.replace(".", ",")}</strong> sem juros
                </p>
              </div>

              {/* Selo FULL & Frete Grátis */}
              <div className="space-y-1.5 border-t border-border/50 pt-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <Truck className="size-4 shrink-0" />
                  <span>Chegará grátis amanhã</span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-black text-emerald-600">
                    FULL
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Enviado pelo centro de distribuição do Mercado Livre
                </p>
              </div>

              {/* Botões de Ação Mercado Livre */}
              <div className="pt-2 space-y-2">
                <Button className="h-11 w-full rounded-xl bg-[#3483FA] text-sm font-bold text-white shadow-md hover:bg-[#2968c8] active:scale-[0.98]">
                  Comprar agora
                </Button>
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl border-blue-500/30 bg-blue-500/10 text-sm font-bold text-blue-600 hover:bg-blue-500/20 active:scale-[0.98]"
                >
                  Adicionar ao carrinho
                </Button>
              </div>

              {/* Garantia */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-blue-600" />
                <span>
                  <strong>Compra Garantida</strong>: receba o produto que está esperando ou devolvemos o dinheiro.
                </span>
              </div>
            </div>

            {/* O que você precisa saber sobre este produto */}
            {listing.caracteristicas && listing.caracteristicas.length > 0 && (
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  O que você precisa saber sobre este produto
                </h3>
                <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
                  {listing.caracteristicas.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-foreground">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ficha Técnica Simplificada */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Características Principais
              </h3>
              <div className="mt-3 divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50 text-xs">
                {Object.entries(listing.fichaTecnica)
                  .filter(([k]) => !["Fabricante", "EAN"].includes(k))
                  .slice(0, 6)
                  .map(([k, v], idx) => (
                    <div
                      key={k}
                      className={`flex items-center justify-between p-2.5 ${
                        idx % 2 === 0 ? "bg-muted/20" : "bg-card"
                      }`}
                    >
                      <span className="font-medium text-muted-foreground">{k}</span>
                      <span className="font-semibold text-foreground">{v.value}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Descrição do Produto */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Descrição do Produto
              </h3>
              <div className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                {listing.descricao}
              </div>
            </div>
          </div>

          {/* Rodapé Fechar */}
          <div className="border-t border-border/60 bg-muted/40 p-3 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              className="rounded-xl px-4 text-xs font-semibold"
            >
              Fechar Prévia
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
