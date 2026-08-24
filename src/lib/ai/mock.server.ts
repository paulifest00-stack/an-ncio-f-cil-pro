import type { Field, ImageBrief, Listing, ProductInput } from "./types";
import { NAO_IDENTIFICADO } from "./types";

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
  relacionadas.push("original com garantia");

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

function generateSkuFromName(name: string, brand?: string, weight?: string, units?: string): string {
  const parts: string[] = [];
  
  if (brand) {
    parts.push(brand.slice(0, 3).toUpperCase());
  }
  
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 0) {
    parts.push(words[0].slice(0, 4));
    if (words[1]) parts.push(words[1].slice(0, 4));
  }

  if (weight) {
    const cleanWeight = weight.toUpperCase().replace(/\s+/g, "");
    parts.push(cleanWeight);
  } else {
    // Check if name has weight (e.g. 1kg, 500g)
    const weightMatch = name.match(/(\d+\s*(?:kg|g|ml|l|un|pct))/i);
    if (weightMatch) {
      parts.push(weightMatch[1].toUpperCase().replace(/\s+/g, ""));
    }
  }

  if (units) {
    const cleanUnits = units.toUpperCase().replace(/\s+/g, "");
    parts.push(cleanUnits.includes("UN") ? cleanUnits : `${cleanUnits}UN`);
  }

  return parts.filter(Boolean).join("-") || "PROD-001";
}

function generateMLTitle(name: string, brand?: string, model?: string): string {
  let title = name.trim();
  if (brand && !title.toLowerCase().includes(brand.toLowerCase())) {
    title = `${title} ${brand}`;
  }
  if (model && !title.toLowerCase().includes(model.toLowerCase())) {
    title = `${title} ${model}`;
  }
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
  const ean = input.ean?.trim() || "";

  // Check if weight/units can be inferred from name
  const weightMatch = name.match(/(\d+\s*(?:kg|g|ml|l|litro|grama|quilo)s?)/i);
  const foundWeight = weight || (weightMatch ? weightMatch[1] : "");
  const unitsMatch = name.match(/(\d+\s*(?:unidades|un|capsulas|peças|unids))/i);
  const foundUnits = units || (unitsMatch ? unitsMatch[1] : "");

  const sku = generateSkuFromName(name, brand, foundWeight, foundUnits);
  const nomeInterno = name;
  const tituloMercadoLivre = generateMLTitle(name, brand);

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
    Marca: brand ? makeField(brand, "usuario") : makeField("Não identificado", "nao_encontrado"),
    Modelo: makeField("Não identificado", "nao_encontrado", "Verificar modelo exato na embalagem"),
    Categoria: category ? makeField(category, "usuario") : makeField("Não identificado", "nao_encontrado"),
    Peso: foundWeight
      ? makeField(foundWeight, weight ? "usuario" : "imagem")
      : makeField("Não identificado", "nao_encontrado"),
    Dimensões: dimensions ? makeField(dimensions, "usuario") : makeField("Não identificado", "nao_encontrado"),
    Quantidade: foundUnits
      ? makeField(foundUnits, units ? "usuario" : "imagem")
      : makeField("Não identificado", "nao_encontrado"),
    Material: makeField("Não identificado", "nao_encontrado"),
    Cor: makeField("Não identificado", "nao_encontrado"),
    Sabor: makeField("Não identificado", "nao_encontrado"),
    Conteúdo: packaging ? makeField(packaging, "usuario") : makeField(name, "usuario"),
    Fabricante: brand ? makeField(brand, "usuario") : makeField("Não identificado", "nao_encontrado"),
    EAN: ean ? makeField(ean, "usuario") : makeField("Não identificado", "nao_encontrado"),
  };

  const caracteristicasConfirmadas: string[] = [
    `Produto original: ${name}`,
  ];
  if (brand) caracteristicasConfirmadas.push(`Marca confirmada: ${brand}`);
  if (foundWeight) caracteristicasConfirmadas.push(`Peso: ${foundWeight}`);
  if (foundUnits) caracteristicasConfirmadas.push(`Quantidade: ${foundUnits}`);
  if (packaging) caracteristicasConfirmadas.push(`Embalagem: ${packaging}`);

  const alertas: string[] = [];
  if (!ean) alertas.push("Código de barras / EAN não informado. Recomenda-se conferir na embalagem antes de publicar.");
  if (!dimensions) alertas.push("Dimensões físicas não identificadas. Preencha caso pretenda utilizar envio com frete cubado.");

  // Build description with confirmed items only
  const descParts: string[] = [
    `# ${tituloMercadoLivre}`,
    "",
    "## APRESENTAÇÃO DO PRODUTO",
    `Apresentamos ${name}${brand ? ` da marca ${brand}` : ""}. Produto original, de alta qualidade, ideal para atender suas necessidades com segurança e praticidade.`,
    "",
    "## PRINCIPAIS CARACTERÍSTICAS",
    ...caracteristicasConfirmadas.map((c) => `• ${c}`),
    "",
    "## ESPECIFICAÇÕES TÉCNICAS",
    `• Nome: ${name}`,
    `• Marca: ${brand || "Não especificada"}`,
    `• Conteúdo: ${foundWeight || foundUnits || packaging || "1 unidade"}`,
    `• SKU de controle: ${sku}`,
    "",
    "## CONTEÚDO DA EMBALAGEM",
    `• 1x ${name}`,
    "",
    "## INFORMAÇÕES IMPORTANTES",
    "• Produto novo, lacrado e bem embalado para o transporte.",
    "• Tire todas as suas dúvidas antes de finalizar a compra pelo campo de perguntas.",
    "",
    "## PERGUNTAS FREQUENTES",
    "P: O produto é original?",
    "R: Sim, produto 100% original e de procedência garantida.",
    "",
    "P: O envio é rápido?",
    "R: Sim, postagem rápida e segura para todo o Brasil.",
  ];

  const safePromptName = name.replace(/[^a-zA-Z0-9\s]/g, "");

  const imagens: ImageBrief[] = [
    {
      tipo: "principal",
      titulo: "1. Foto Principal de Catálogo",
      prompt: `Commercial product photography of ${safePromptName}, centered, pure white background #FFFFFF, professional studio lighting, soft subtle drop shadow, crystal clear sharpness, pristine packaging, 8k resolution catalog style`,
      observacoes: "Fundo branco 100%, iluminação neutra de estúdio, produto centralizado e inteiro.",
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(`Commercial product photograph of ${safePromptName} on pure white background, studio lighting, crisp packaging, catalog photography`)}?width=800&height=800&nologo=true`,
    },
    {
      tipo: "objecoes",
      titulo: "2. Quebra de Objeções (Infográfico Limpo)",
      prompt: `Minimalist commercial product shot of ${safePromptName} on clean white background, accompanied by subtle elegant feature badges showing confirmed specs: original quality, pristine packaging, studio commercial photo`,
      observacoes: "Fundo branco com até 3 informações essenciais confirmadas.",
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(`Minimalist product photo of ${safePromptName} on white background with clean sleek feature highlights, high end commercial style`)}?width=800&height=800&nologo=true`,
    },
    {
      tipo: "detalhes",
      titulo: "3. Foto de Detalhes e Textura",
      prompt: `Macro close-up studio shot of ${safePromptName}, focusing on fine packaging details, texture and quality seal, soft diffused studio light, pure white background, hyperrealistic macro photography`,
      observacoes: "Foco nos detalhes reais da embalagem, textura e lacre de segurança.",
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(`Macro detailed close-up shot of ${safePromptName} packaging, studio lighting, white backdrop, hyperdetailed`)}?width=800&height=800&nologo=true`,
    },
    {
      tipo: "contexto",
      titulo: "4. Foto em Uso / Contexto Realista",
      prompt: `Realistic lifestyle commercial photography of ${safePromptName} placed in an authentic, beautifully styled natural setting, warm ambient lighting, editorial aesthetic, true-to-life scene`,
      observacoes: "Cenário realista e elegante mostrando o produto no seu ambiente de uso natural.",
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(`Lifestyle product photography of ${safePromptName} in a realistic elegant setting, authentic commercial photo`)}?width=800&height=800&nologo=true`,
    },
  ];

  return {
    resumo: `Anúncio gerado com base nas informações confirmadas para "${name}". ${alertas.length ? "Existem itens pendentes de confirmação (consulte os alertas)." : "Todas as informações básicas foram validadas."}`,
    sku,
    nomeInterno,
    tituloMercadoLivre,
    descricao: descParts.join("\n"),
    palavrasChave: keywords,
    fichaTecnica,
    caracteristicas: caracteristicasConfirmadas,
    alertas,
    imagens,
  };
}
