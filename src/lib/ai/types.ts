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
  kitQuantity?: number;
  brand?: string;
  ean?: string;
  ncm?: string;
  category?: string;
  cost?: string;
  weight?: string;
  dimensions?: string;
  units?: string;
  packaging?: string;
  other?: string;
  cachedIdentificacao?: Identificacao;
}

/** PASSO 1 — identificação exata do produto a partir da foto. */
export interface Identificacao {
  produto: string;
  marca: string;
  linha: string;
  variacao: string;
  volume: string;
  /** Texto lido literalmente na embalagem. */
  leituraEmbalagem: string[];
  certeza: "alta" | "media" | "baixa";
  duvidas: string[];
  /** Cor dominante do rótulo/tampa em hexadecimal, ex: "#E4002B". */
  corAcento: string;
  /** largura ÷ altura do produto recortado. */
  proporcao: number;
  layout: "A" | "B" | "C";
  termosBusca: string[];
  dominioOficial?: string;
}

export type ReferenceKind = "oficial" | "marketplace" | "busca";

export interface Referencia {
  titulo: string;
  url: string;
  tipo: ReferenceKind;
  /** true quando o link foi verificado e respondeu. */
  verificado?: boolean;
  observacao?: string;
}

export interface PontoImagem {
  texto: string;
  icone: string;
  fonte: string;
}

/** PASSO 3 — plano da arte antes de gerar a imagem. */
export interface ImagePlan {
  proporcao: number;
  layout: "A" | "B" | "C";
  corAcento: string;
  titulo: { linha1: string; linha2: string; linha3: string };
  pontos: PontoImagem[];
  naoConfirmado: string[];
}

export interface ImageBrief {
  tipo: "principal" | "objecoes" | "detalhes" | "contexto";
  titulo: string;
  prompt: string;
  observacoes: string;
  plano?: ImagePlan;
  url?: string;
}

export interface SkuVariacao {
  variacao: string;
  sku: string;
  ean?: string;
}

export interface Listing {
  id?: string;
  sku: string;
  skuPai?: string;
  skuFilho?: string;
  variacoesSku?: SkuVariacao[];
  nomeInterno: string;
  tituloMercadoLivre: string;
  kitQuantity?: number;
  ncm?: string;
  ean?: string;
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
  identificacao?: Identificacao;
  referencias?: Referencia[];
}

export type ListingSection =
  | "sku"
  | "nomeInterno"
  | "tituloMercadoLivre"
  | "descricao"
  | "palavrasChave"
  | "fichaTecnica"
  | "imagens";

