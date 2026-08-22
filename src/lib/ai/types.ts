export type FieldSource = "usuario" | "imagem" | "pesquisa" | "nao_encontrado";

export const NAO_IDENTIFICADO = "Não identificado";

export interface Field {
  /** Valor confirmado. Vazio ou "Não identificado" quando não houver informação. */
  value: string;
  source: FieldSource;
  /** Observação: conflito entre fontes, necessidade de confirmação, etc. */
  note?: string;
}

export interface ProductInput {
  photoDataUrl: string;
  basicName: string;
  brand?: string;
  ean?: string;
  category?: string;
  cost?: string;
  weight?: string;
  dimensions?: string;
  units?: string;
  packaging?: string;
  other?: string;
}

export interface ImageBrief {
  tipo: "principal" | "objecoes" | "detalhes" | "contexto";
  titulo: string;
  prompt: string;
  observacoes: string;
}

export interface Listing {
  sku: string;
  nomeInterno: string;
  tituloMercadoLivre: string;
  descricao: string;
  palavrasChave: {
    principais: string[];
    relacionadas: string[];
    variacoes: string[];
  };
  fichaTecnica: Record<string, Field>;
  caracteristicas: string[];
  alertas: string[];
  resumo: string;
  imagens: ImageBrief[];
}

export type ListingSection =
  | "sku"
  | "nomeInterno"
  | "tituloMercadoLivre"
  | "descricao"
  | "palavrasChave"
  | "fichaTecnica"
  | "imagens";
