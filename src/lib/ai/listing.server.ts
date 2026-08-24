import { chatJson, generateImage, type ChatMessage } from "./gateway.server";
import {
  IMAGENS_REGRAS,
  PASSO1,
  PASSO2_PONTOS,
  REGRA_OURO,
  REGRAS_SKU,
  SCHEMA,
  identificacaoBlock,
  listingContext,
  objectionImagePrompt,
  photoImagePrompt,
  userDataBlock,
} from "./prompts.server";
import {
  NAO_IDENTIFICADO,
  type Field,
  type Identificacao,
  type ImagePlan,
  type Listing,
  type ListingSection,
  type ProductInput,
  type Referencia,
} from "./types";

const CAMPOS_FICHA = [
  "Produto",
  "Marca",
  "Modelo",
  "Categoria",
  "NCM",
  "EAN",
  "Peso",
  "Dimensões",
  "Quantidade",
  "Material",
  "Cor",
  "Sabor",
  "Conteúdo",
  "Fabricante",
];

function normalizeField(raw: unknown): Field {
  const f = (raw ?? {}) as Partial<Field>;
  const value = (f.value ?? "").toString().trim();
  const empty =
    !value ||
    /^(n[aã]o identificad|informa[cç][aã]o n[aã]o encontrada|desconhecid|n\/a|-)/i.test(
      value,
    );
  return {
    value: empty ? NAO_IDENTIFICADO : value,
    source: empty
      ? "nao_encontrado"
      : ((f.source ?? "pesquisa") as Field["source"]),
    ...(f.note ? { note: f.note } : {}),
  };
}

function deduplicateWords(text: string): string {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ0-9]/gi, "");
    // Preserva conectivos como de, com, para, em, e
    if (["de", "com", "para", "em", "e", "do", "da", "dos", "das", "no", "na", "nos", "nas"].includes(lower)) {
      clean.push(w);
      continue;
    }
    if (lower.length > 2 && seen.has(lower)) {
      continue;
    }
    if (lower.length > 2) {
      seen.add(lower);
    }
    clean.push(w);
  }
  return clean.join(" ");
}

function defaultImagesForProduct(input: ProductInput, name: string): ImageBrief[] {
  const prodName = name || input.basicName || "Produto";
  return [
    {
      tipo: "principal",
      titulo: "Foto Principal (Fundo Branco #FFFFFF)",
      prompt: `commercial product photography of ${prodName}, isolated on a pure seamless clean white background #FFFFFF, studio lighting, soft shadows, ultra sharp focus, crisp details, centered composition, square 1:1 format`,
      observacoes: "Padrão oficial Mercado Livre para primeira foto de catálogo (Fundo Branco Puro)",
    },
    {
      tipo: "objecoes",
      titulo: "Arte de Quebra de Objeções (Infográfico)",
      prompt: `commercial advertising infographic banner for ${prodName}, square 1:1, modern clean vector badges with checkmarks, crisp typography, studio lighting`,
      observacoes: "Infográfico persuasivo com layout e cores de destaque da embalagem",
    },
    {
      tipo: "detalhes",
      titulo: "Foto de Detalhes / Textura / Rótulo",
      prompt: `macro close-up photography of ${prodName}, highlighting premium materials, label typography and packaging finish, soft studio lighting, sharp textures, square 1:1`,
      observacoes: "Destaque de qualidade, bico/tampa, textura ou acabamento da embalagem",
    },
    {
      tipo: "contexto",
      titulo: "Foto em Uso / Ambiente Realista",
      prompt: `lifestyle commercial photography of ${prodName} in real everyday usage scenario, aesthetically pleasing background, warm natural lighting, professional advertising shot, square 1:1`,
      observacoes: "Foto humanizada demonstrando o produto em uso real para gerar conexão emocional",
    },
  ];
}

function normalize(raw: Partial<Listing>, input: ProductInput): Listing {
  const ficha: Record<string, Field> = {};
  const rawFicha = (raw.fichaTecnica ?? {}) as Record<string, unknown>;
  for (const campo of CAMPOS_FICHA)
    ficha[campo] = normalizeField(rawFicha[campo]);
  for (const [k, v] of Object.entries(rawFicha)) {
    if (!ficha[k]) ficha[k] = normalizeField(v);
  }
  const kw = raw.palavrasChave ?? {
    principais: [],
    relacionadas: [],
    variacoes: [],
  };

  const ncmValue =
    raw.ncm ||
    (ficha["NCM"]?.value !== NAO_IDENTIFICADO ? ficha["NCM"]?.value : "") ||
    input.ncm ||
    "";

  const eanValue =
    raw.ean ||
    (ficha["EAN"]?.value !== NAO_IDENTIFICADO ? ficha["EAN"]?.value : "") ||
    input.ean ||
    "";

  const cleanNomeInterno = deduplicateWords(raw.nomeInterno ?? input.basicName);
  const cleanTituloMl = deduplicateWords(raw.tituloMercadoLivre ?? input.basicName);

  const rawImgs = (raw.imagens ?? []) as ImageBrief[];
  const defaultImgs = defaultImagesForProduct(input, cleanNomeInterno);
  const mergedImagens: ImageBrief[] = [];

  for (const def of defaultImgs) {
    const found = rawImgs.find((img) => img.tipo === def.tipo);
    if (found) {
      mergedImagens.push({
        ...def,
        ...found,
        titulo: found.titulo || def.titulo,
        prompt: found.prompt || def.prompt,
        observacoes: found.observacoes || def.observacoes,
      });
    } else {
      mergedImagens.push(def);
    }
  }

  return {
    resumo: raw.resumo ?? "",
    sku: raw.sku ?? raw.skuFilho ?? raw.skuPai ?? "",
    skuPai: raw.skuPai ?? "",
    skuFilho: raw.skuFilho ?? "",
    variacoesSku: raw.variacoesSku ?? [],
    nomeInterno: cleanNomeInterno,
    tituloMercadoLivre: cleanTituloMl,
    ncm: ncmValue,
    ean: eanValue,
    descricao: raw.descricao ?? "",
    palavrasChave: {
      principais: kw.principais ?? [],
      relacionadas: kw.relacionadas ?? [],
      variacoes: kw.variacoes ?? [],
    },
    fichaTecnica: ficha,
    caracteristicas: raw.caracteristicas ?? [],
    alertas: raw.alertas ?? [],
    imagens: mergedImagens,
  };
}

function buildSearchReferences(
  id: Identificacao,
  input: ProductInput,
): Referencia[] {
  // Termo limpo e seguro para pesquisa
  const rawTerms =
    id.termosBusca && id.termosBusca.length > 0
      ? id.termosBusca[0]
      : `${id.marca || input.brand || ""} ${id.produto || input.basicName || ""} ${id.volume || ""}`.trim();

  // Limpa caracteres especiais, parênteses e pontuação que quebram URLs
  const cleanTerms = rawTerms
    .replace(/[^\w\s\u00C0-\u00FF]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const brand = (id.marca || input.brand || "").trim();
  const encodedTerm = encodeURIComponent(cleanTerms);

  // Slug seguro para o Mercado Livre (sem acentos e apenas letras/números/hífens)
  const mlSlug = cleanTerms
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const refs: Referencia[] = [
    {
      titulo: `Mercado Livre — ${cleanTerms}`,
      url: `https://lista.mercadolivre.com.br/${mlSlug}`,
      tipo: "marketplace",
      observacao: "Ver anúncios concorrentes, preços reais e descrições no Mercado Livre",
    },
    {
      titulo: `Amazon Brasil — ${cleanTerms}`,
      url: `https://www.amazon.com.br/s?k=${encodedTerm}`,
      tipo: "marketplace",
      observacao: "Ver perguntas de compradores, avaliações e detalhes na Amazon",
    },
    {
      titulo: `Google Imagens (Fotos Reais) — ${cleanTerms}`,
      url: `https://www.google.com/search?q=${encodedTerm}&tbm=isch`,
      tipo: "busca",
      observacao: "Encontrar imagens em alta resolução e fotos de catálogo reais",
    },
    {
      titulo: `Shopee — ${cleanTerms}`,
      url: `https://shopee.com.br/search?keyword=${encodedTerm}`,
      tipo: "marketplace",
      observacao: "Ver variações, combos e fotos na Shopee",
    },
    {
      titulo: `Busca no Google — ${cleanTerms}`,
      url: `https://www.google.com/search?q=${encodedTerm}`,
      tipo: "busca",
      observacao: "Comparar ficha técnica, distribuidores e informações na web",
    },
  ];

  // Se houver marca identificada, adiciona busca garantida pelo site oficial/fabricante
  if (brand) {
    const brandQuery = encodeURIComponent(`${brand} site oficial brasil`);
    refs.unshift({
      titulo: `Site Oficial da Marca (${brand})`,
      url: `https://www.google.com/search?q=${brandQuery}`,
      tipo: "oficial",
      verificado: true,
      observacao: `Buscar site oficial e catálogo do fabricante ${brand}`,
    });
  }

  return refs;
}

export async function scanProductPhoto(
  photoDataUrl: string,
): Promise<{
  identificacao: Identificacao;
  sugestoes: {
    basicName?: string;
    brand?: string;
    category?: string;
    weight?: string;
    packaging?: string;
    units?: string;
    ean?: string;
  };
}> {
  const idMessages: ChatMessage[] = [
    {
      role: "system",
      content: `Você é um especialista em OCR e identificação de produtos e embalagens para e-commerce.\n${REGRA_OURO}`,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            PASSO1,
            "",
            "Identifique todos os dados visíveis na foto: nome completo comercial do produto, marca, categoria, peso/volume, código de barras/EAN (se visível), embalagem e cor de destaque.",
          ].join("\n"),
        },
        { type: "image_url", image_url: { url: photoDataUrl } },
      ],
    },
  ];

  let idResult: Identificacao;
  try {
    idResult = await chatJson<Identificacao>(idMessages);
  } catch (err) {
    console.error("Erro no escaneamento rápido da foto:", err);
    idResult = {
      produto: "",
      marca: "",
      linha: "",
      variacao: "",
      volume: "",
      leituraEmbalagem: [],
      certeza: "baixa",
      duvidas: ["Não foi possível ler os detalhes da foto automaticamente."],
      corAcento: "#141414",
      proporcao: 1.0,
      layout: "C",
      termosBusca: [],
    };
  }

  // Monta sugestões limpas para pré-preenchimento sem duplicações
  const rawParts = [
    idResult.produto,
    idResult.linha && !idResult.produto.toLowerCase().includes(idResult.linha.toLowerCase()) ? idResult.linha : "",
    idResult.volume && !idResult.produto.toLowerCase().includes(idResult.volume.toLowerCase()) ? idResult.volume : "",
  ].filter(Boolean);

  const basicName = deduplicateWords(rawParts.join(" "));

  // Tenta extrair EAN de leituraEmbalagem se houver
  const eanMatch = idResult.leituraEmbalagem?.find((t) => /^\d{8,14}$/.test(t.replace(/\D/g, "")));

  return {
    identificacao: idResult,
    sugestoes: {
      basicName: basicName || idResult.produto || undefined,
      brand: idResult.marca || undefined,
      weight: idResult.volume || undefined,
      packaging: idResult.linha || undefined,
      ean: eanMatch ? eanMatch.replace(/\D/g, "") : undefined,
    },
  };
}

export async function buildListing(input: ProductInput): Promise<Listing> {
  let idResult: Identificacao;

  // Se já temos a identificação pré-escaneada da foto, reutilizamos diretamente para evitar redundância e economizar tokens/créditos
  if (input.cachedIdentificacao && (input.cachedIdentificacao.produto || input.cachedIdentificacao.marca)) {
    idResult = {
      ...input.cachedIdentificacao,
      produto: input.basicName || input.cachedIdentificacao.produto,
      marca: input.brand || input.cachedIdentificacao.marca,
      volume: input.weight || input.cachedIdentificacao.volume,
    };
  } else {
    // ETAPA 1: Identificação visual minuciosa do produto na foto
    const idMessages: ChatMessage[] = [
      {
        role: "system",
        content: `Você é um especialista em identificação de produtos e embalagens.\n${REGRA_OURO}`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              PASSO1,
              "",
              "Dados informados pelo usuário (se houver):",
              userDataBlock(input) || "- (somente foto e nome básico)",
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: input.photoDataUrl } },
        ],
      },
    ];

    try {
      idResult = await chatJson<Identificacao>(idMessages);
    } catch (err) {
      console.error("Erro no Passo 1 de identificação:", err);
      idResult = {
        produto: input.basicName,
        marca: input.brand || "",
        linha: "",
        variacao: "",
        volume: "",
        leituraEmbalagem: [],
        certeza: "media",
        duvidas: [],
        corAcento: "#141414",
        proporcao: 1.0,
        layout: "C",
        termosBusca: [
          `${input.brand || ""} ${input.basicName}`.trim(),
          input.basicName,
        ],
      };
    }
  }

  // Monta as referências de busca na internet
  const referencias = buildSearchReferences(idResult, input);

  // ETAPA 2 & 3: Levantamento de pontos de quebra de objeções e plano de layout
  const planMessages: ChatMessage[] = [
    {
      role: "system",
      content: `Você é um especialista em design de anúncios de alta conversão para marketplace.\n${REGRA_OURO}`,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            identificacaoBlock(idResult),
            "",
            "Dados do usuário:",
            userDataBlock(input) || "- (somente foto e nome básico)",
            "",
            PASSO2_PONTOS,
          ].join("\n"),
        },
        { type: "image_url", image_url: { url: input.photoDataUrl } },
      ],
    },
  ];

  let planResult: ImagePlan;
  try {
    planResult = await chatJson<ImagePlan>(planMessages);
    // Assegura que o layout e cor de acento coincidam ou respeitem a proporção
    if (!planResult.corAcento || planResult.corAcento === "#000000") {
      planResult.corAcento = idResult.corAcento || "#141414";
    }
  } catch (err) {
    console.error("Erro no Passo 2/3 de planejamento de imagem:", err);
    planResult = {
      proporcao: idResult.proporcao || 1.0,
      layout: idResult.layout || "C",
      corAcento: idResult.corAcento || "#141414",
      titulo: {
        linha1: idResult.produto || input.basicName,
        linha2: idResult.linha || idResult.marca || input.brand || "Original",
        linha3: idResult.volume || "Pronto Entrega",
      },
      pontos: [
        { texto: "PRODUTO 100% ORIGINAL", icone: "shield", fonte: "rótulo" },
        { texto: "ALTA QUALIDADE E DURABILIDADE", icone: "star", fonte: "rótulo" },
        { texto: "ENVIO RÁPIDO E SEGURO", icone: "box", fonte: "usuário" },
        { texto: "PRONTO PARA USO", icone: "check", fonte: "rótulo" },
      ],
      naoConfirmado: [],
    };
  }

  // ETAPA 4: Geração do anúncio completo (Mercado Livre + Bling + SKU Pai/Filho)
  const listingMessages: ChatMessage[] = [
    {
      role: "system",
      content: `Você é o maior especialista em criação de anúncios para Mercado Livre e cadastro no ERP Bling.\n${REGRA_OURO}`,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "Gere o anúncio completo e os SKUs padronizados seguindo rigorosamente o esquema abaixo.",
            "",
            identificacaoBlock(idResult),
            "",
            "Plano da Imagem de Objeções gerado:",
            JSON.stringify(planResult, null, 2),
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

  const rawListing = await chatJson<Partial<Listing>>(listingMessages);
  const listing = normalize(rawListing, input);

  // Vincula os dados estruturados da identificação, referências e plano de imagem
  listing.identificacao = idResult;
  listing.referencias = referencias;

  // Atualiza ou insere o prompt definitivo da imagem de quebra de objeções
  const objectionPrompt = objectionImagePrompt(planResult);
  let objImg = listing.imagens.find((i) => i.tipo === "objecoes");
  if (!objImg) {
    objImg = {
      tipo: "objecoes",
      titulo: "Arte de Quebra de Objeções (Infográfico)",
      prompt: objectionPrompt,
      observacoes: `Layout ${planResult.layout} baseado na proporção ${planResult.proporcao.toFixed(2)}`,
      plano: planResult,
    };
    listing.imagens.push(objImg);
  } else {
    objImg.prompt = objectionPrompt;
    objImg.observacoes = `Layout ${planResult.layout} (Proporção ${planResult.proporcao.toFixed(2)})`;
    objImg.plano = planResult;
  }

  // Se houver dúvidas não confirmadas em idResult ou planResult, anexa aos alertas
  const extraAlerts = [
    ...idResult.duvidas,
    ...(planResult.naoConfirmado || []),
  ].filter(Boolean);
  for (const alert of extraAlerts) {
    if (!listing.alertas.includes(alert)) {
      listing.alertas.push(alert);
    }
  }

  return listing;
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
      content: `Você é um especialista em anúncios de marketplace (Mercado Livre e Bling).\n${REGRA_OURO}\n${REGRAS_SKU}`,
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
    for (const [k, v] of Object.entries(
      (result.fichaTecnica ?? {}) as Record<string, unknown>,
    )) {
      ficha[k] = normalizeField(v);
    }
    return { fichaTecnica: ficha };
  }
  if (section === "sku") {
    return {
      sku: result.sku ?? listing.sku,
      skuPai: result.skuPai ?? listing.skuPai,
      skuFilho: result.skuFilho ?? listing.skuFilho,
      variacoesSku: result.variacoesSku ?? listing.variacoesSku,
    };
  }
  return { [key]: result[key as keyof Listing] } as Partial<Listing>;
}

export async function renderAdImage(
  prompt: string,
  photoDataUrl: string,
): Promise<string> {
  // Se o prompt já for o do infográfico (já estruturado com regras 1:1 e layout), envia diretamente
  const isInfographic = prompt.includes("infographic image") || prompt.includes("RULES FOR ALL LAYOUTS");
  const finalPrompt = isInfographic ? prompt : photoImagePrompt(prompt);
  return generateImage(finalPrompt, photoDataUrl);
}
