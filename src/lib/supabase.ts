import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Listing, ProductInput } from "./ai/types";

// Acesso seguro a variáveis de ambiente (Browser, SSR e Lovable Preview)
const getEnvVar = (name: string, fallback: string): string => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== "undefined" && process.env && process.env[name]) {
      return process.env[name] as string;
    }
  } catch {
    // ignore
  }
  return fallback;
};

export const SUPABASE_URL = getEnvVar(
  "VITE_SUPABASE_URL",
  "https://kqdawcxylqrrtufckgmd.supabase.co",
);

export const SUPABASE_ANON_KEY = getEnvVar(
  "VITE_SUPABASE_ANON_KEY",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZGF3Y3h5bHFycnR1ZmNrZ21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjA3OTYsImV4cCI6MjEwMjIzNjc5Nn0.IJx0f0dRWiW1GsiJqzgA7LshevfN9vU7oJs3O_gpJHo",
);

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface DbListing {
  id: string;
  created_at: string;
  updated_at: string;
  sku: string;
  sku_pai?: string;
  sku_filho?: string;
  variacoes_sku?: any[];
  nome_interno: string;
  titulo_mercadolivre: string;
  descricao?: string;
  palavras_chave?: any;
  ficha_tecnica?: any;
  caracteristicas?: string[];
  alertas?: string[];
  resumo?: string;
  imagens?: any[];
  identificacao?: any;
  referencias?: any[];
  photo_url?: string;
  user_input?: any;
}

/** Salva o anúncio gerado no banco de dados Supabase */
export async function saveListingToSupabase(
  listing: Listing,
  input: ProductInput,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .insert({
        sku: listing.sku,
        sku_pai: listing.skuPai,
        sku_filho: listing.skuFilho,
        variacoes_sku: listing.variacoesSku ?? [],
        nome_interno: listing.nomeInterno,
        titulo_mercadolivre: listing.tituloMercadoLivre,
        descricao: listing.descricao,
        palavras_chave: listing.palavrasChave,
        ficha_tecnica: listing.fichaTecnica,
        caracteristicas: listing.caracteristicas,
        alertas: listing.alertas,
        resumo: listing.resumo,
        imagens: listing.imagens,
        identificacao: listing.identificacao,
        referencias: listing.referencias,
        photo_url: input.photoDataUrl,
        user_input: input,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("Erro ao salvar no Supabase:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.warn("Falha de rede ao conectar com Supabase:", err);
    return null;
  }
}

/** Busca os anúncios mais recentes salvos no Supabase */
export async function getRecentListingsFromSupabase(
  limit = 20,
): Promise<DbListing[]> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Erro ao buscar no Supabase:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn("Falha de rede com Supabase:", err);
    return [];
  }
}

/** Atualiza um anúncio existente no banco de dados Supabase */
export async function updateListingInSupabase(
  id: string,
  listing: Listing,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("listings")
      .update({
        sku: listing.sku,
        sku_pai: listing.skuPai,
        sku_filho: listing.skuFilho,
        variacoes_sku: listing.variacoesSku ?? [],
        nome_interno: listing.nomeInterno,
        titulo_mercadolivre: listing.tituloMercadoLivre,
        descricao: listing.descricao,
        palavras_chave: listing.palavrasChave,
        ficha_tecnica: listing.fichaTecnica,
        caracteristicas: listing.caracteristicas,
        alertas: listing.alertas,
        resumo: listing.resumo,
        imagens: listing.imagens,
        identificacao: listing.identificacao,
        referencias: listing.referencias,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.warn("Erro ao atualizar no Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Falha de rede ao atualizar no Supabase:", err);
    return false;
  }
}

/** Exclui um anúncio do banco de dados Supabase */
export async function deleteListingFromSupabase(
  id: string,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

