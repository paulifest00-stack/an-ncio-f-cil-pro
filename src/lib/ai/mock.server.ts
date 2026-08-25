import type { Field, ImageBrief, Listing, ProductInput, Referencia, SkuVariacao } from "./types";
import { NAO_IDENTIFICADO } from "./types";
import { generateValidEan13 } from "../ean";

function extractKeywords(name: string, brand?: string, category?: string): {
  principais: string[];
  relacionadas: string[];
  variacoes: string[];
} {
  const cleanName = name.trim();
  const words = cleanName.split(/\s+/).filter(Boolean);

  const principais = [cleanName];
  if (brand && !cleanName.toLowerCase().includes(brand.toLowerCase())) {
    principais.push(`${cleanName} ${brand}`);
  }
  if (words.length > 2) {
    principais.push(words.slice(0, 2).join(" "));
  }

  const relacionadas: string[] = [];
  if (category) relacionadas.push(category);
  relacionadas.push(`comprar ${words[0] || "produto"}`);
  if (brand) relacionadas.push(`marca ${brand}`);
  relacionadas.push("original com nota fiscal");
  relacionadas.push("pronta entrega mercado livre");

  const variacoes: string[] = [
    cleanName.toLowerCase(),
    words.join(" "),
  ];
  if (words.length > 1) {
    variacoes.push(`${words[words.length - 1]} ${words.slice(0, -1).join(" ")}`);
  }

  return {
    principais: Array.from(new Set(principais)),
    relacionadas: Array.from(new Set(relacionadas)),
    variacoes: Array.from(new Set(variacoes)),
  };
}

function generateSkuPair(name: string, brand?: string, weight?: string, kitQty: number = 1): {
  sku: string;
  skuPai: string;
  skuFilho: string;
  variacoesSku: SkuVariacao[];
} {
  const brandCode = brand
    ? brand.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase()
    : "PROD";

  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  const nameCode = words.length > 0 ? words[0].slice(0, 4) : "ITEM";
  const kitCode = kitQty > 1 ? `K0${kitQty}` : "";
  const weightCode = weight ? weight.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";

  const skuPai = `${brandCode}${nameCode}${kitCode}`.slice(0, 16);
  const skuFilho = weightCode ? `${skuPai}-${weightCode}` : `${skuPai}-PADRAO`;

  const variacoesSku: SkuVariacao[] = [
    {
      variacao: weight || "Padrão",
      sku: skuFilho,
      ean: generateValidEan13("789"),
    },
  ];

  return {
    sku: skuFilho,
    skuPai,
    skuFilho,
    variacoesSku,
  };
}

function generateMLTitle(name: string, brand?: string, kitQty: number = 1, weight?: string): string {
  let parts: string[] = [];
  if (kitQty > 1) {
    parts.push(`Kit ${kitQty}`);
  }
  parts.push(name.trim());
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    parts.push(brand.trim());
  }
  if (weight && !name.toLowerCase().includes(weight.toLowerCase())) {
    parts.push(weight.trim());
  }

  let title = parts.join(" ");
  if (title.length > 60) {
    title = title.slice(0, 60).trim();
  }
  return title;
}

export function generateMockListing(input: ProductInput): Listing {
  const name = input.basicName.trim();
  const brand = input.brand?.trim() || "";
  const weight = input.weight?.trim() || "";
  const units = input.units?.trim() || "";
  const category = input.category?.trim() || "";
  const dimensions = input.dimensions?.trim() || "";
  const packaging = input.packaging?.trim() || "";
  const userEan = input.ean?.trim() || "";
  const userNcm = input.ncm?.trim() || "";
  const effectiveKitQty = input.kitQuantity || 1;
  const isKit = effectiveKitQty > 1;

  // Inferência de peso/volume do nome se não informado
  const weightMatch = name.match(/(\d+\s*(?:kg|g|ml|l|litro|grama|quilo)s?)/i);
  const foundWeight = weight || (weightMatch ? weightMatch[1] : "");

  const { sku, skuPai, skuFilho, variacoesSku } = generateSkuPair(name, brand, foundWeight, effectiveKitQty);
  const nomeInterno = isKit ? `Kit ${effectiveKitQty}x ${name}` : name;
  const tituloMercadoLivre = generateMLTitle(name, brand, effectiveKitQty, foundWeight);
  const generatedEan = userEan || generateValidEan13("789");
  const finalNcm = userNcm || "9617.00.10";

  const keywords = extractKeywords(name, brand, category);

  const makeField = (
    val?: string,
    source: Field["source"] = "usuario",
    note?: string
  ): Field => {
    if (!val || val.trim() === "" || val === NAO_IDENTIFICADO) {
      return { value: NAO_IDENTIFICADO, source: "nao_encontrado" };
    }
    return { value: val.trim(), source, ...(note ? { note } : {}) };
  };

  const fichaTecnica: Record<string, Field> = {
    Produto: makeField(name, "usuario"),
    Marca: brand ? makeField(brand, "usuario") : makeField("Não especificada", "nao_encontrado"),
    Modelo: makeField("Padrão", "usuario"),
    Categoria: category ? makeField(category, "usuario") : makeField("Geral", "usuario"),
    NCM: makeField(finalNcm, userNcm ? "usuario" : "pesquisa", "Classificação fiscal NCM"),
    EAN: makeField(generatedEan, userEan ? "usuario" : "pesquisa", "Código GTIN/EAN-13"),
    Peso: foundWeight ? makeField(foundWeight, "usuario") : makeField("Não identificado", "nao_encontrado"),
    Dimensões: dimensions ? makeField(dimensions, "usuario") : makeField("Não identificado", "nao_encontrado"),
    Quantidade: makeField(isKit ? `${effectiveKitQty} Unidades (Kit Promocional)` : "1 Unidade", "usuario"),
    Material: makeField("Conforme fabricante", "pesquisa"),
    Cor: makeField("Original da foto", "imagem"),
    Conteúdo: packaging ? makeField(packaging, "usuario") : makeField(name, "usuario"),
    Fabricante: brand ? makeField(brand, "usuario") : makeField("Não informado", "nao_encontrado"),
  };

  const caracteristicasConfirmadas: string[] = [
    `Produto original: ${name}`,
  ];
  if (brand) caracteristicasConfirmadas.push(`Marca: ${brand}`);
  if (foundWeight) caracteristicasConfirmadas.push(`Volume/Peso: ${foundWeight}`);
  if (isKit) caracteristicasConfirmadas.push(`Kit Promocional: ${effectiveKitQty} unidades`);
  if (packaging) caracteristicasConfirmadas.push(`Embalagem: ${packaging}`);

  const alertas: string[] = [
    "⚡ Gerado em Modo Offline (Sem consumo de créditos de IA). Todos os dados, prompts fotográficos e SKUs foram estruturados deterministicamente.",
  ];
  if (!userEan) alertas.push("Código de barras EAN-13 gerado automaticamente com cálculo GS1 Brasil.");
  if (!userNcm) alertas.push("Classificação NCM sugerida padrão. Confirme com sua contabilidade antes de emitir nota.");

  // Monta descrição completa estruturada para alta conversão
  const descParts: string[] = [
    `# ${tituloMercadoLivre}`,
    "",
    "## APRESENTAÇÃO DO PRODUTO",
    `Apresentamos ${name}${brand ? ` da marca ${brand}` : ""}${isKit ? ` em kit promocional exclusivo com ${effectiveKitQty} unidades` : ""}. Produto novo, 100% original e desenvolvido com materiais de alta qualidade para garantir máxima durabilidade, desempenho e praticidade no seu dia a dia.`,
    "",
    "## PRINCIPAIS CARACTERÍSTICAS E BENEFÍCIOS",
    ...caracteristicasConfirmadas.map((c) => `• ${c}`),
    "• Excelente custo-benefício e acabamento de alto padrão",
    "• Produto resistente, testado e pronto para entrega imediata",
    isKit ? `• Economia garantida ao adquirir o kit com ${effectiveKitQty} unidades no mesmo frete` : "",
    "",
    "## ESPECIFICAÇÕES TÉCNICAS",
    `• Nome: ${name}`,
    `• Marca: ${brand || "Original"}`,
    `• Formato: ${isKit ? `Kit com ${effectiveKitQty} Unidades` : "1 Unidade Avulsa"}`,
    `• NCM Fiscal: ${finalNcm}`,
    `• Código EAN-13: ${generatedEan}`,
    `• SKU de Controle: ${sku}`,
    "",
    "## CONTEÚDO DA EMBALAGEM",
    `• ${isKit ? `0${effectiveKitQty}x` : "01x"} ${name}`,
    "",
    "## GARANTIA E SEGURANÇA",
    "• Produto lacrado na embalagem original.",
    "• Compra 100% Segura e Garantida.",
    "",
    "## DÚVIDAS FREQUENTES (FAQ)",
    "P: O produto é original e acompanha nota fiscal?",
    "R: Sim! Trabalhamos apenas com produtos 100% originais e emitimos nota fiscal para todas as vendas.",
    "",
    "P: Os produtos estão disponíveis a pronta entrega?",
    "R: Sim! Todos os nossos produtos estão em estoque prontos para envio imediato.",
  ].filter(Boolean);

  const safePromptName = name.replace(/[^a-zA-Z0-9\s]/g, "");

  const imagens: ImageBrief[] = [
    {
      tipo: "principal",
      titulo: isKit ? `Foto 1: Kit com ${effectiveKitQty} Unidades (Fundo Branco)` : "Foto 1: Catálogo em Fundo Branco #FFFFFF",
      prompt: isKit
        ? `commercial product photography of a retail pack of exactly ${effectiveKitQty} identical units of ${safePromptName}, placed symmetrically on a pure clean seamless white background #FFFFFF, studio lighting, crisp drop shadows, high sharpness, centered 1:1 square`
        : `commercial product photography of ${safePromptName}, isolated on a pure seamless clean white background #FFFFFF, studio lighting, crisp soft shadows, ultra sharp focus, centered 1:1 square format`,
      observacoes: "Padrão oficial para primeira foto do Mercado Livre (Fundo Branco Puro)",
    },
    {
      tipo: "objecoes",
      titulo: isKit ? `Foto 2: Infográfico de Benefícios do Kit ${effectiveKitQty}x` : "Foto 2: Infográfico de Quebra de Objeções",
      prompt: `commercial advertising infographic banner for ${safePromptName}, square 1:1, sleek modern vector badges with checkmarks highlighting original quality, fast shipping, and premium materials, studio lighting`,
      observacoes: "Infográfico persuasivo com pontos de destaque e quebra de dúvidas",
    },
    {
      tipo: "detalhes",
      titulo: "Foto 3: Macro de Detalhes, Rótulo e Acabamento",
      prompt: `macro close-up detailed studio photography of ${safePromptName}, focusing on fine texture, label typography and packaging finish, soft diffused studio light, pure white background, sharp 1:1`,
      observacoes: "Destaque da qualidade, textura, bico/tampa e rótulo do produto",
    },
    {
      tipo: "contexto",
      titulo: "Foto 4: Foto em Uso / Estilo de Vida (Lifestyle)",
      prompt: `lifestyle commercial photography of ${safePromptName} in real everyday usage setting, aesthetically pleasing natural background, warm ambient lighting, professional advertising shot, square 1:1`,
      observacoes: "Foto humanizada mostrando o produto em cenário realista de uso",
    },
  ];

  const cleanQuery = encodeURIComponent(`${brand} ${name}`.trim());
  const referencias: Referencia[] = [
    {
      titulo: `Mercado Livre — ${name}`,
      url: `https://lista.mercadolivre.com.br/${cleanQuery}`,
      tipo: "marketplace",
      observacao: "Ver concorrência e preços no Mercado Livre",
    },
    {
      titulo: `Google Imagens — ${name}`,
      url: `https://www.google.com/search?q=${cleanQuery}&tbm=isch`,
      tipo: "busca",
      observacao: "Encontrar fotos de catálogo em alta resolução",
    },
    {
      titulo: `Shopee — ${name}`,
      url: `https://shopee.com.br/search?keyword=${cleanQuery}`,
      tipo: "marketplace",
      observacao: "Comparar anúncios e combos na Shopee",
    },
  ];

  return {
    resumo: `Anúncio gerado em modo offline rápido para "${name}". Todas as seções, SKUs, dados fiscais e prompts de imagem 1:1 foram estruturados com sucesso.`,
    sku,
    skuPai,
    skuFilho,
    variacoesSku,
    ncm: finalNcm,
    ean: generatedEan,
    nomeInterno,
    tituloMercadoLivre,
    descricao: descParts.join("\n"),
    palavrasChave: keywords,
    fichaTecnica,
    caracteristicas: caracteristicasConfirmadas,
    alertas,
    imagens,
    referencias,
  };
}
