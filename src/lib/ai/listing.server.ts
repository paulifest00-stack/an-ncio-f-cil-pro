import { chatJson, generateImage, type ChatMessage } from "./gateway.server";
import { IMAGENS_REGRAS, REGRA_OURO, SCHEMA, listingContext, userDataBlock } from "./prompts.server";
import { NAO_IDENTIFICADO, type Field, type Listing, type ListingSection, type ProductInput } from "./types";

const CAMPOS_FICHA = [
  "Produto",
  "Marca",
  "Modelo",
  "Categoria",
  "Peso",
  "Dimensões",
  "Quantidade",
  "Material",
  "Cor",
  "Sabor",
  "Conteúdo",
  "Fabricante",
  "EAN",
];

function analysisMessages(input: ProductInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: `Você é um especialista em cadastro de produtos e anúncios de marketplace (Mercado Livre).\n${REGRA_OURO}`,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "Analise a foto do produto e os dados informados pelo usuário.",
            "Identifique visualmente o que for possível (marca, modelo, peso, volume, quantidade, embalagem, material, cor, sabor, conteúdo, fabricante, tipo de produto).",
            "Complemente com conhecimento público confiável sobre este produto específico apenas quando tiver certeza (fabricante, marca, ficha técnica oficial).",
            "",
            "Dados informados pelo usuário:",
            userDataBlock(input) || "- (somente foto e nome básico)",
            "",
            IMAGENS_REGRAS,
            "",
            SCHEMA,
          ].join("\n"),
        },
        { type: "image_url", image_url: { url: input.photoDataUrl } },
      ],
    },
  ];
}

function normalizeField(raw: unknown): Field {
  const f = (raw ?? {}) as Partial<Field>;
  const value = (f.value ?? "").toString().trim();
  const empty = !value || /^(n[aã]o identificad|informa[cç][aã]o n[aã]o encontrada|desconhecid|n\/a|-)/i.test(value);
  return {
    value: empty ? NAO_IDENTIFICADO : value,
    source: empty ? "nao_encontrado" : ((f.source ?? "pesquisa") as Field["source"]),
    ...(f.note ? { note: f.note } : {}),
  };
}

function normalize(raw: Partial<Listing>, input: ProductInput): Listing {
  const ficha: Record<string, Field> = {};
  const rawFicha = (raw.fichaTecnica ?? {}) as Record<string, unknown>;
  for (const campo of CAMPOS_FICHA) ficha[campo] = normalizeField(rawFicha[campo]);
  for (const [k, v] of Object.entries(rawFicha)) {
    if (!ficha[k]) ficha[k] = normalizeField(v);
  }
  const kw = raw.palavrasChave ?? { principais: [], relacionadas: [], variacoes: [] };
  return {
    resumo: raw.resumo ?? "",
    sku: raw.sku ?? "",
    nomeInterno: raw.nomeInterno ?? input.basicName,
    tituloMercadoLivre: raw.tituloMercadoLivre ?? input.basicName,
    descricao: raw.descricao ?? "",
    palavrasChave: {
      principais: kw.principais ?? [],
      relacionadas: kw.relacionadas ?? [],
      variacoes: kw.variacoes ?? [],
    },
    fichaTecnica: ficha,
    caracteristicas: raw.caracteristicas ?? [],
    alertas: raw.alertas ?? [],
    imagens: raw.imagens ?? [],
  };
}

export async function buildListing(input: ProductInput): Promise<Listing> {
  const raw = await chatJson<Partial<Listing>>(analysisMessages(input));
  return normalize(raw, input);
}

const SECTION_LABEL: Record<ListingSection, string> = {
  sku: "sku",
  nomeInterno: "nomeInterno",
  tituloMercadoLivre: "tituloMercadoLivre",
  descricao: "descricao",
  palavrasChave: "palavrasChave",
  fichaTecnica: "fichaTecnica",
  imagens: "imagens",
};

export async function regenerate(
  section: ListingSection,
  input: ProductInput,
  listing: Listing,
): Promise<Partial<Listing>> {
  const key = SECTION_LABEL[section];
  const result = await chatJson<Partial<Listing>>([
    {
      role: "system",
      content: `Você é um especialista em anúncios de marketplace.\n${REGRA_OURO}`,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            `Regenere APENAS o campo "${key}" do anúncio, mantendo as informações já confirmadas e sem criar novas características.`,
            "",
            "Dados do usuário:",
            userDataBlock(input) || "- (somente foto e nome básico)",
            "",
            "Anúncio atual (contexto confirmado):",
            listingContext(listing),
            "",
            section === "imagens" ? IMAGENS_REGRAS : "",
            "",
            `Responda somente com JSON: { "${key}": ... } no mesmo formato do anúncio.`,
            SCHEMA,
          ].join("\n"),
        },
        { type: "image_url", image_url: { url: input.photoDataUrl } },
      ],
    },
  ]);

  if (section === "fichaTecnica") {
    const ficha: Record<string, Field> = {};
    for (const [k, v] of Object.entries((result.fichaTecnica ?? {}) as Record<string, unknown>)) {
      ficha[k] = normalizeField(v);
    }
    return { fichaTecnica: ficha };
  }
  return { [key]: result[key as keyof Listing] } as Partial<Listing>;
}

export async function renderAdImage(prompt: string, photoDataUrl: string): Promise<string> {
  const guarded = [
    prompt,
    "",
    "Strict rules: keep the exact product from the reference photo — same packaging, same logo, same printed text, same colors, same shape, same quantity.",
    "Do not add accessories, do not invent labels or text, do not restyle the packaging.",
    "Result must look like a real professional product photograph: clean, minimal, sharp, natural studio lighting, no AI-looking artifacts, no heavy graphics.",
  ].join("\n");
  return generateImage(guarded, photoDataUrl);
}
