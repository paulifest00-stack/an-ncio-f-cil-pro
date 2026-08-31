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
import { validarNcmOficial, formatNcm } from "../ncm";
import { generateValidEan13 } from "../ean";
import { generateMockListing } from "./mock.server";
import {
  NAO_IDENTIFICADO,
  type Field,
  type Identificacao,
  type ImageBrief,
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

/** Remove lixo de OCR e placeholders ("Não identificado", "N/A", etc.) de nomes. */
export function sanitizeName(text: string): string {
  if (!text) return "";
  let out = text
    // placeholders inteiros
    .replace(
      /\b(n[aã]o\s+identificad[oa]s?|n[aã]o\s+informad[oa]s?|desconhecid[oa]s?|indefinid[oa]s?|sem\s+informa[cç][aã]o|informa[cç][aã]o\s+n[aã]o\s+encontrada|undefined|unknown|null|nan|n\/a|n\.a\.)\b/gi,
      " ",
    )
    // parênteses/colchetes que ficaram vazios
    .replace(/[([{]\s*[)\]}]/g, " ")
    // símbolos soltos e pontuação órfã
    .replace(/[|<>_*#@^~`"']/g, " ")
    .replace(/\s+[-–—/,;:]+\s*(?=$|[-–—/,;:])/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—/,;:.]+|[\s\-–—/,;:.]+$/g, "")
    .trim();

  // remove tokens de 1 caractere sem sentido (lixo de OCR) preservando números e "e"
  out = out
    .split(/\s+/)
    .filter((w) => w.length > 1 || /[0-9eE]/.test(w))
    .join(" ");

  return out.trim();
}

function deduplicateWords(text: string): string {
  if (!text) return "";
  const words = sanitizeName(text).trim().split(/\s+/);
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
  return clean.join(" ").trim();
}


function defaultImagesForProduct(
  input: ProductInput,
  name: string,
  raw?: Partial<Listing>,
): ImageBrief[] {

  const prodName = name || input.basicName || "Produto";
  const isKit = Boolean(input.kitQuantity && input.kitQuantity > 1);
  const kitQty = input.kitQuantity || 1;

  const noWatermark = "no added text, no watermark, no logo overlay, no fake stock-photo badge";

  const principalPrompt = isKit
    ? `commercial product photography of a retail kit containing exactly ${kitQty} identical units of ${prodName}, arranged symmetrically and neatly side-by-side on a pure seamless clean white background #FFFFFF, studio lighting, crisp contact shadows, ultra sharp focus, crisp details, centered composition, square 1:1 format, ${noWatermark}`
    : `commercial product photography of ${prodName}, isolated on a pure seamless clean white background #FFFFFF, studio lighting, soft shadows, ultra sharp focus, crisp details, centered composition, square 1:1 format, ${noWatermark}`;

  const principalObs = isKit
    ? `Foto Principal do Kit com ${kitQty} unidades agrupadas em Fundo Branco Puro #FFFFFF (Padrão Oficial Mercado Livre)`
    : "Padrão oficial Mercado Livre para primeira foto de catálogo (Fundo Branco Puro)";

  const objecoesPrompt = isKit
    ? `commercial advertising infographic banner for Kit with ${kitQty} units of ${prodName}, square 1:1, modern clean vector badges highlighting kit value and pack savings, crisp typography, studio lighting`
    : `commercial advertising infographic banner for ${prodName}, square 1:1, modern clean vector badges with checkmarks, crisp typography, studio lighting`;

  const detalhesPrompt = isKit
    ? `macro close-up photography of ${prodName} pack of ${kitQty} units, highlighting premium materials, label typography and packaging finish, soft studio lighting, sharp textures, square 1:1, ${noWatermark}`
    : `macro close-up photography of ${prodName}, highlighting premium materials, label typography and packaging finish, soft studio lighting, sharp textures, square 1:1, ${noWatermark}`;

  const contextoPrompt = isKit
    ? `lifestyle commercial photography of the ${kitQty}-unit kit of ${prodName} in real everyday usage scenario, aesthetically pleasing background, warm natural lighting, professional advertising shot, square 1:1, ${noWatermark}`
    : `lifestyle commercial photography of ${prodName} in real everyday usage scenario, aesthetically pleasing background, warm natural lighting, professional advertising shot, square 1:1, ${noWatermark}`;

  const escalaPrompt = isKit
    ? `commercial product photography of the ${kitQty}-unit pack of ${prodName} placed next to a common reference object (ruler or standard coin) for size and scale comparison, pure white background #FFFFFF, studio lighting, sharp focus, square 1:1 format, ${noWatermark}`
    : `commercial product photography of ${prodName} placed next to a common reference object (ruler or standard coin) for size and scale comparison, pure white background #FFFFFF, studio lighting, sharp focus, square 1:1 format, ${noWatermark}`;

  const conteudoPrompt = isKit
    ? `flat lay top-down commercial photography showing all ${kitQty} items and accessories included in the package of ${prodName} neatly arranged and symmetrically organized, pure white background #FFFFFF, studio lighting, square 1:1 format, ${noWatermark}`
    : `flat lay top-down commercial photography showing the product ${prodName} and everything included in the retail package neatly organized, pure white background #FFFFFF, studio lighting, square 1:1 format, ${noWatermark}`;

  const festaPrompt = isKit
    ? `lifestyle commercial photography of the ${kitQty}-unit set of ${prodName} displayed in a festive birthday party table, buffet celebration or decorative dessert setting, warm natural lighting, festive aesthetics, professional advertising shot, square 1:1, ${noWatermark}`
    : `lifestyle commercial photography of ${prodName} displayed in a festive birthday party table, buffet celebration or decorative dessert setting, warm natural lighting, festive aesthetics, professional advertising shot, square 1:1, ${noWatermark}`;

  const list: ImageBrief[] = [
    {
      tipo: "principal",
      titulo: isKit ? `Foto Principal do Kit (${kitQty} Unidades - Fundo Branco)` : "Foto Principal (Fundo Branco #FFFFFF)",
      prompt: principalPrompt,
      observacoes: principalObs,
    },
    {
      tipo: "objecoes",
      titulo: isKit ? `Arte de Quebra de Objeções (Kit ${kitQty} Unidades)` : "Arte de Quebra de Objeções (Infográfico)",
      prompt: objecoesPrompt,
      observacoes: isKit ? `Infográfico destacando a economia e benefícios do kit de ${kitQty} unidades` : "Infográfico persuasivo com layout e cores de destaque da embalagem",
    },
    {
      tipo: "detalhes",
      titulo: "Foto de Detalhes / Textura / Rótulo",
      prompt: detalhesPrompt,
      observacoes: "Destaque de qualidade, bico/tampa, textura ou acabamento da embalagem",
    },
    {
      tipo: "contexto",
      titulo: isKit ? `Foto em Uso / Ambiente (Kit ${kitQty} Unidades)` : "Foto em Uso / Ambiente Realista",
      prompt: contextoPrompt,
      observacoes: "Foto humanizada demonstrando o produto em uso real para gerar conexão emocional",
    },
    {
      tipo: "escala",
      titulo: "Foto com Referência de Tamanho (Escala)",
      prompt: escalaPrompt,
      observacoes: "Mostra o produto ao lado de objeto comum (régua/moeda) para evitar dúvidas de tamanho",
    },
    {
      tipo: "conteudo",
      titulo: isKit ? `Flat Lay do Kit (${kitQty} Unidades)` : "Flat Lay do Conteúdo da Embalagem",
      prompt: conteudoPrompt,
      observacoes: "Visão aérea superior exibindo todos os itens que acompanham a embalagem",
    },
    {
      tipo: "festa",
      titulo: "Foto Ambientada em Decoração / Festa",
      prompt: festaPrompt,
      observacoes: "Ambientação temática em mesa de festa/decoração para alta conversão em marketplace",
    },
  ];

  // 3.3 Banner de Variações (apenas se houver mais de 1 variação SKU)
  const variacoes = raw?.variacoesSku || [];
  if (variacoes.length > 1) {
    const varNames = variacoes.map((v) => v.variacao).join(", ");
    list.push({
      tipo: "variacoes",
      titulo: `Banner de Variações (${variacoes.length} Opções)`,
      prompt: `commercial product comparison banner displaying ${variacoes.length} different color and size variations of ${prodName} (${varNames}) arranged neatly side by side, clean studio lighting, pure white background #FFFFFF, square 1:1 format, ${noWatermark}`,
      observacoes: `Banner exibindo as ${variacoes.length} variações disponíveis (${varNames})`,
    });
  }

  // 3.5 Diagrama de Medidas (apenas se as dimensões forem confirmadas)
  const dimVal = input.dimensions || (raw?.fichaTecnica as Record<string, Field> | undefined)?.["Dimensões"]?.value;
  if (dimVal && dimVal !== NAO_IDENTIFICADO && !dimVal.toLowerCase().includes("não identificado")) {
    list.push({
      tipo: "medidas",
      titulo: "Diagrama Técnico com Medidas Reais",
      prompt: `technical product diagram of ${prodName} with clean dimension measurement arrows indicating height, width and depth labeled with the exact confirmed dimensions: ${dimVal}, clean minimal line-art overlay over the real product, pure white background #FFFFFF, square 1:1 format, ${noWatermark}`,
      observacoes: `Diagrama visual com cotas de medidas confirmadas (${dimVal})`,
    });
  }

  return list;
}

function normalize(raw: Partial<Listing>, input: ProductInput): Listing {
  const ficha: Record<string, Field> = {};
  const rawFicha = (raw.fichaTecnica ?? {}) as Record<string, unknown>;
  for (const campo of CAMPOS_FICHA)
    ficha[campo] = normalizeField(rawFicha[campo]);
  for (const [k, v] of Object.entries(rawFicha)) {
    if (!ficha[k]) ficha[k] = normalizeField(v);
  }

  // Se for kit, garante que a quantidade na ficha técnica reflita o kit
  if (input.kitQuantity && input.kitQuantity > 1) {
    ficha["Quantidade"] = {
      value: `${input.kitQuantity} Unidades (Kit Promocional)`,
      source: "usuario",
      note: `Kit com ${input.kitQuantity} unidades`,
    };
  }

  const kw = raw.palavrasChave ?? {
    principais: [],
    relacionadas: [],
    variacoes: [],
  };

  const rawNcm =
    raw.ncm ||
    (ficha["NCM"]?.value !== NAO_IDENTIFICADO ? ficha["NCM"]?.value : "") ||
    input.ncm ||
    "";

  // Validação oficial do NCM com a tabela Receita Federal / Siscomex
  const ncmValidation = validarNcmOficial(rawNcm);
  const ncmValue = ncmValidation.codigoFormatado || rawNcm;
  const alertas = [...(raw.alertas ?? [])];

  if (ncmValidation.valido) {
    ficha["NCM"] = {
      value: ncmValidation.codigoFormatado,
      source: "pesquisa",
      note: `NCM oficial confirmado: ${ncmValidation.descricaoOficial?.slice(0, 100)}...`,
    };
  } else if (rawNcm && rawNcm !== NAO_IDENTIFICADO) {
    if (ncmValidation.aviso && !alertas.includes(ncmValidation.aviso)) {
      alertas.push(ncmValidation.aviso);
    }
  }

  const eanValue =
    raw.ean ||
    (ficha["EAN"]?.value !== NAO_IDENTIFICADO ? ficha["EAN"]?.value : "") ||
    input.ean ||
    "";

  const cleanNomeInterno = deduplicateWords(raw.nomeInterno ?? input.basicName).toUpperCase();
  const cleanTituloMl = deduplicateWords(raw.tituloMercadoLivre ?? input.basicName);


  const rawImgs = (raw.imagens ?? []) as ImageBrief[];
  const defaultImgs = defaultImagesForProduct(input, cleanNomeInterno, raw);
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
    kitQuantity: input.kitQuantity || raw.kitQuantity || 1,
    ncm: ncmValue,
    ncmValidado: ncmValidation.valido,
    ncmDescricaoOficial: ncmValidation.descricaoOficial,
    ean: eanValue,
    descricao: raw.descricao ?? "",
    palavrasChave: {
      principais: kw.principais ?? [],
      relacionadas: kw.relacionadas ?? [],
      variacoes: kw.variacoes ?? [],
    },
    fichaTecnica: ficha,
    caracteristicas: raw.caracteristicas ?? [],
    alertas,
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
  customKeys?: string[],
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
  error?: string;
  status?: "ok" | "sem_creditos" | "error";
  hasContent?: boolean;
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
  let scanError: string | undefined;
  let scanStatus: "ok" | "sem_creditos" | "error" = "ok";

  try {
    idResult = await chatJson<Identificacao>(idMessages, undefined, customKeys);
  } catch (err) {
    console.error("Erro no escaneamento rápido da foto:", err);
    const msg = err instanceof Error ? err.message : String(err);
    scanError = msg;
    if (msg.includes("402") || msg.toLowerCase().includes("crédito") || msg.toLowerCase().includes("insuficiente")) {
      scanStatus = "sem_creditos";
    } else {
      scanStatus = "error";
    }

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
    idResult.marca,
    idResult.produto,
    idResult.linha && !idResult.produto.toLowerCase().includes(idResult.linha.toLowerCase()) ? idResult.linha : "",
    idResult.volume && !idResult.produto.toLowerCase().includes(idResult.volume.toLowerCase()) ? idResult.volume : "",
  ].filter(Boolean);

  const basicName = deduplicateWords(rawParts.join(" "));

  // Tenta extrair EAN de leituraEmbalagem se houver
  const eanMatch = idResult.leituraEmbalagem?.find((t) => /^\d{8,14}$/.test(t.replace(/\D/g, "")));

  const hasContent = Boolean(basicName || idResult.produto || idResult.marca || idResult.volume);

  return {
    identificacao: idResult,
    sugestoes: {
      basicName: basicName || idResult.produto || undefined,
      brand: idResult.marca || undefined,
      weight: idResult.volume || undefined,
      packaging: idResult.linha || undefined,
      ean: eanMatch ? eanMatch.replace(/\D/g, "") : undefined,
    },
    error: scanError,
    status: scanStatus,
    hasContent,
  };
}

export async function buildListing(input: ProductInput, customKeys?: string[]): Promise<Listing> {
  try {
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
        idResult = await chatJson<Identificacao>(idMessages, undefined, customKeys);
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
      planResult = await chatJson<ImagePlan>(planMessages, undefined, customKeys);
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

    const rawListing = await chatJson<Partial<Listing>>(
      listingMessages,
      undefined,
      customKeys,
      0.4,
    );
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
  } catch (err) {
    console.warn("Falha na geração via IA (provável falta de créditos ou indisponibilidade). Ativando Modo Offline determinístico:", err);
    return generateMockListing(input);
  }
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
  customKeys?: string[],
): Promise<Partial<Listing>> {
  const key = SECTION_LABEL[section];
  try {
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
    ], undefined, customKeys);

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
  } catch (err) {
    console.warn(`Falha na regeneração da seção ${section} via IA. Aplicando fallback offline:`, err);
    const mock = generateMockListing(input);
    if (section === "tituloMercadoLivre") return { tituloMercadoLivre: mock.tituloMercadoLivre };
    if (section === "descricao") return { descricao: mock.descricao };
    if (section === "palavrasChave") return { palavrasChave: mock.palavrasChave };
    if (section === "fichaTecnica") return { fichaTecnica: mock.fichaTecnica };
    if (section === "sku") return { sku: mock.sku, skuPai: mock.skuPai, skuFilho: mock.skuFilho, variacoesSku: mock.variacoesSku };
    if (section === "imagens") return { imagens: mock.imagens };
    return {};
  }
}

export async function renderAdImage(
  prompt: string,
  photoDataUrl: string,
  customKeys?: string[],
): Promise<string> {
  // Se o prompt já for o do infográfico (já estruturado com regras 1:1 e layout), envia diretamente
  const isInfographic = prompt.includes("infographic image") || prompt.includes("RULES FOR ALL LAYOUTS");
  const finalPrompt = isInfographic ? prompt : photoImagePrompt(prompt);
  return generateImage(finalPrompt, photoDataUrl, customKeys);
}

export async function transformListingToKit(
  targetKitQuantity: number,
  input: ProductInput,
  currentListing: Listing,
  customKeys?: string[],
): Promise<Listing> {
  const updatedInput: ProductInput = {
    ...input,
    kitQuantity: targetKitQuantity,
  };

  const isKit = targetKitQuantity > 1;
  const newEan = generateValidEan13("789");

  const promptMessages: ChatMessage[] = [
    {
      role: "system",
      content: `Você é um especialista em converter e criar anúncios de alta conversão para Mercado Livre e Bling no formato Kit Multi-Unidades.\n${REGRA_OURO}\n${REGRAS_SKU}`,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            `Converta o anúncio atual para o formato ${isKit ? `KIT COM ${targetKitQuantity} UNIDADES` : "1 UNIDADE (AVULSO)"}.`,
            "",
            "DIRETRIZES CRÍTICAS PARA ESSA CONVERSÃO:",
            isKit
              ? `- TÍTULO MERCADO LIVRE: Deve começar com "Kit ${targetKitQuantity} [Produto]...", ser persuasivo, objetivo e ter no MÁXIMO 60 caracteres (sem palavras repetidas).`
              : `- TÍTULO MERCADO LIVRE: Título para 1 unidade avulsa, máx 60 caracteres.`,
            isKit
              ? `- SKU PAI: Identifica a linha familiar + kit (ex: GMPOTRET24K0${targetKitQuantity} ou POPTPC150K0${targetKitQuantity}). NUNCA coloque a variação (ex: 750ml) no SKU Pai!`
              : `- SKU PAI: Base familiar sem sufixo de kit (ex: GMPOTRET24).`,
            `- SKU FILHO: Herda o SKU Pai e adiciona a variação com hífen (ex: GMPOTRET24K0${targetKitQuantity}-750 ou POPTPC150K0${targetKitQuantity}-AZ).`,
            `- VARIAÇÕES DE SKU: Liste a variação atual e sugira as variações irmãs da família com seus respectivos SKUs filhos adaptados para o Kit.`,
            isKit
              ? `- DESCRIÇÃO: Na seção CONTEÚDO DA EMBALAGEM, liste "0${targetKitQuantity}x Unidades/Pacotes de [Nome do Produto]" e explique no texto as vantagens da compra em kit (economia, custo por unidade, frete único).`
              : `- DESCRIÇÃO: Ajuste para 1 unidade avulsa.`,
            `- FICHA TÉCNICA: Campo "Quantidade" deve ser "${targetKitQuantity} Unidades ${isKit ? "(Kit Promocional)" : ""}".`,
            "",
            "Anúncio atual de referência:",
            listingContext(currentListing),
            "",
            "Dados do usuário:",
            userDataBlock(updatedInput) || "- (somente foto e nome básico)",
            "",
            SCHEMA,
          ].join("\n"),
        },
        { type: "image_url", image_url: { url: input.photoDataUrl } },
      ],
    },
  ];

  let raw: Partial<Listing>;
  try {
    raw = await chatJson<Partial<Listing>>(promptMessages, undefined, customKeys);
  } catch (err) {

    console.error("Erro ao converter anúncio para kit via IA, aplicando transformação determinística:", err);
    raw = {
      tituloMercadoLivre: isKit
        ? `Kit ${targetKitQuantity} ${currentListing.tituloMercadoLivre.replace(/^kit\s*\d*x?\s*/i, "").trim()}`.slice(0, 60)
        : currentListing.tituloMercadoLivre.replace(/^kit\s*\d*x?\s*/i, "").trim(),
      nomeInterno: isKit
        ? `Kit ${targetKitQuantity}x ${currentListing.nomeInterno.replace(/^kit\s*\d*x?\s*/i, "").trim()}`
        : currentListing.nomeInterno.replace(/^kit\s*\d*x?\s*/i, "").trim(),
      descricao: currentListing.descricao,
      fichaTecnica: currentListing.fichaTecnica,
    };
  }

  const updatedListing = normalize(raw, updatedInput);
  updatedListing.ean = newEan;
  if (updatedListing.fichaTecnica["EAN"]) {
    updatedListing.fichaTecnica["EAN"].value = newEan;
  }
  updatedListing.identificacao = currentListing.identificacao;
  updatedListing.referencias = currentListing.referencias;

  // Garante que as variações também recebam novos EANs válidos se não tiverem
  if (updatedListing.variacoesSku && updatedListing.variacoesSku.length > 0) {
    updatedListing.variacoesSku = updatedListing.variacoesSku.map((v) => ({
      ...v,
      ean: generateValidEan13("789"),
    }));
  }

  // Preserva o plano do infográfico de quebra de objeções sem perder os pontos técnicos reais
  const existingObj = currentListing.imagens.find((i) => i.tipo === "objecoes");
  const plan = existingObj?.plano || (currentListing.identificacao ? {
    proporcao: currentListing.identificacao?.proporcao || 1.0,
    layout: currentListing.identificacao?.layout || "C",
    corAcento: currentListing.identificacao?.corAcento || "#141414",
    titulo: {
      linha1: isKit ? `KIT COM ${targetKitQuantity} UNIDADES` : (currentListing.identificacao?.produto || "PRODUTO"),
      linha2: currentListing.identificacao?.linha || currentListing.identificacao?.marca || "ORIGINAL",
      linha3: currentListing.identificacao?.volume || "PRONTA ENTREGA",
    },
    pontos: existingObj?.plano?.pontos || [
      { texto: "PRODUTO 100% ORIGINAL", icone: "shield", fonte: "rótulo" },
      { texto: "ALTA QUALIDADE E DURABILIDADE", icone: "star", fonte: "rótulo" },
      { texto: "ENVIO RÁPIDO E SEGURO", icone: "box", fonte: "usuário" },
      { texto: "PRONTO PARA USO", icone: "check", fonte: "rótulo" },
    ],
    naoConfirmado: [],
  } : undefined);

  if (plan) {
    const objPrompt = objectionImagePrompt(plan as ImagePlan);
    let targetObjImg = updatedListing.imagens.find((i) => i.tipo === "objecoes");
    if (targetObjImg) {
      targetObjImg.prompt = objPrompt;
      targetObjImg.plano = plan as ImagePlan;
      targetObjImg.titulo = isKit ? `Arte de Quebra de Objeções (Kit ${targetKitQuantity} Unidades)` : "Arte de Quebra de Objeções (Infográfico)";
      targetObjImg.observacoes = `Infográfico persuasivo com pontos técnicos e layout ${plan.layout}`;
    }
  }

  return updatedListing;
}
