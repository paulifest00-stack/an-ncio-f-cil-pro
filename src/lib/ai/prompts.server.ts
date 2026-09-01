import type { Identificacao, ImagePlan, Listing, ProductInput } from "./types";

export const REGRA_OURO = `
REGRA ABSOLUTA — NUNCA INVENTAR INFORMAÇÕES.
- Nunca crie, deduza ou assuma como fato algo que não esteja visível na foto, informado pelo usuário ou solidamente conhecido do produto real.
- Nunca estime peso, dimensões, quantidade, composição, certificações, benefícios ou dados técnicos.
- Quando não souber, use exatamente "Não identificado".
- Em caso de dúvida entre duas possibilidades, não escolha: use "Não identificado" e registre a dúvida em "note" e em "alertas".
- Prioridade: PRECISÃO > COMPLETUDE > CRIATIVIDADE.

Cada campo da ficha técnica deve declarar a origem em "source":
"usuario" (informado pelo usuário), "imagem" (lido na foto), "pesquisa" (conhecimento público confiável sobre o produto: site do fabricante/marca, ficha técnica oficial, distribuidores confiáveis) ou "nao_encontrado".
Só use "pesquisa" quando tiver certeza consolidada sobre aquele produto específico; caso contrário use "nao_encontrado".
Escreva sempre em português do Brasil.
`.trim();

export function userDataBlock(input: ProductInput): string {
  const isKit = Boolean(input.kitQuantity && input.kitQuantity > 1);
  const kitQty = input.kitQuantity || 1;

  const pairs: [string, string | undefined][] = [
    ["Nome básico", input.basicName],
    ["Formato de Venda", isKit ? `KIT PROMOCIONAL COM ${kitQty} UNIDADES (Multi-pack / Atacado)` : "1 Unidade (Individual / Avulso)"],
    ["Quantidade no Kit", isKit ? `${kitQty} unidades` : undefined],
    ["Marca", input.brand],
    ["EAN/Código de barras", input.ean],
    ["NCM", input.ncm],
    ["Categoria", input.category],
    ["Custo", input.cost],
    ["Peso/Volume individual", input.weight],
    ["Dimensões", input.dimensions],
    ["Embalagem", input.packaging],
    ["Descrição do produto escrita pelo vendedor (informação confiável, use como fonte)", input.other],
  ];

  const formatted = pairs
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v!.trim()}`)
    .join("\n");

  if (isKit) {
    return [
      formatted,
      "",
      `>>> DIRETRIZES OBRIGATÓRIAS PARA ANÚNCIO DE KIT COM ${kitQty} UNIDADES:`,
      `- TÍTULO MERCADO LIVRE: Deve destacar o kit no início de forma persuasiva (ex: "Kit ${kitQty} [Nome Produto] [Especificação]", max 60 chars, sem redundâncias).`,
      `- NOME INTERNO BLING: Estruturar como "Kit ${kitQty}x [Nome Produto] [Volume/Tamanho]".`,
      `- SKU: O SKU deve indicar a quantidade do kit de ${kitQty} unidades (ex: no bloco de quantidade usar K0${kitQty} ou ${kitQty}UN, ex: POPTPC150K0${kitQty}).`,
      `- FICHA TÉCNICA: Campo "Quantidade" deve ser obrigatoriamente "${kitQty} Unidades (Kit Promocional)".`,
      `- DESCRIÇÃO: Na seção CONTEÚDO DA EMBALAGEM, listar claramente "0${kitQty}x Unidades de [Nome do Produto]" e destacar no texto os benefícios de comprar o kit (economia, estoque, melhor custo por unidade).`,
      `- FOTO PRINCIPAL: A Foto 1 deve descrever no prompt exatamente ${kitQty} unidades idênticas do produto exibidas juntas com harmonia sobre fundo branco puro #FFFFFF.`,
    ].join("\n");
  }

  return formatted;
}

export const REGRAS_SKU = `
REGRAS E PADRONIZAÇÃO DE GERAÇÃO DE SKU (PAI E FILHO):
1. ESTRUTURA GERAL DO SKU:
O SKU é formado pela Aglutinação do Bloco Base (SKU Pai) seguido de um Sufixo de Variação (SKU Filho) delimitado por hífen (-).
[MARCA][CATEGORIA/PRODUTO][ESPECIFICACAO_FIXA][QTD_BASE] - [VARIACAO]
|<--------------------- SKU PAI --------------------->| |<-- SKU FILHO -->|

2. COMPONENTES DO SKU PAI (BASE DA FAMÍLIA):
O SKU Pai identifica a família do produto SEM o atributo que varia (cor, tamanho, volume ou sabor).
- Ordem 1 (Marca/Fornecedor): 2 a 3 letras (Ex: POP = Popper, BP = Bompack, GM = Gour Max, PP = Pic Pic)
- Ordem 2 (Tipo/Categoria): 3 a 6 letras (Ex: TPC = Tinta Pinta Cabelo, LUVNIT = Luva Nitrílica, POTRET = Pote Retangular)
- Ordem 3 (Atributo Fixo - Opcional): 2 a 4 caracteres (Ex: PR = Preta, FLUO = Fluorescente)
- Ordem 4 (Embalagem/Qtd Base ou Kit): 2 a 5 caracteres (Ex: 150 = 150ml quando fixo, 100 = 100un, 24 = 24un, K02 = Kit 2un, K03 = Kit 3un, K05 = Kit 5un)

REGRA DE OURO SKU PAI VS SKU FILHO:
- Se o produto varia em volume/capacidade (ex: Pote Retangular 250ml, 500ml, 750ml, 1000ml), o SKU Pai é a BASE FAMILIAR (ex: GMPOTRET24) e o volume entra EXCLUSIVAMENTE no SKU Filho (ex: GMPOTRET24-750). NUNCA coloque 750 no SKU Pai de potes!
- Se o produto varia em cor (ex: Tinta Spray Azul, Rosa, Vermelha), o SKU Pai é POPTPC150 e a cor entra no SKU Filho (POPTPC150-AZ).
- Se o produto varia em tamanho (ex: Luva P, M, G), o SKU Pai é BPLUVNITPR100 e o tamanho entra no SKU Filho (BPLUVNITPR100-M).
- No campo "variacoesSku", você DEVE SEMPRE listar a variação ativa e sugerir as variações irmãs daquela linha (ex: para potes plásticos sugerir 250ml, 500ml, 750ml, 1000ml com seus respectivos SKUs filhos e campos EAN).

Exemplos de SKU Pai:
- POPTPC150 (Popper + Tinta Pinta Cabelo + 150ml)
- POPTPC150K03 (Kit 3 Unidades da Tinta Spray Popper)
- BPLUVNITPR100 (Bompack + Luva Nitrílica + Preta + 100un)
- BPLUVNITPR100K02 (Kit 2 Caixas de Luva Nitrílica)
- GMPOTRET24 (Gour Max + Pote Retangular + 24un - SEM o volume de 750ml)
- GMPOTRET24K03 (Kit 3 Pacotes de Pote Retangular Gour Max)

3. COMPONENTES DO SKU FILHO (VARIAÇÕES):
O SKU Filho herda o SKU Pai e recebe '-' + código da variação.
Exemplos Práticos:
- Pote Retangular Gour Max c/ 24un (Pai: GMPOTRET24):
  * 250 ml: GMPOTRET24-250
  * 500 ml: GMPOTRET24-500
  * 750 ml: GMPOTRET24-750
  * 1000 ml: GMPOTRET24-1000
- Spray Pinta Cabelo Popper 150ml (Pai: POPTPC150):
  * Azul: POPTPC150-AZ
  * Rosa: POPTPC150-RS
- Luva Nitrílica Bompack 100un (Pai: BPLUVNITPR100):
  * Tam P: BPLUVNITPR100-P
  * Tam M: BPLUVNITPR100-M
  * Tam G: BPLUVNITPR100-G

4. REGRAS DE FORMATAÇÃO:
- Somente letras maiúsculas (sem acentos ou caracteres especiais).
- Permitidos apenas A-Z, 0-9 e o separador hífen (-).
- Sem espaços em branco.
- Comprimento: Pai (8 a 16 caracteres), Filho (10 a 20 caracteres).
`.trim();

/* ───────────────────────── PASSO 1 — IDENTIFICAR ───────────────────────── */

export const PASSO1 = `
Você recebeu a foto de um produto. Execute em ordem:

PASSO 1 — IDENTIFICAR
Descubra exatamente qual é o produto: marca, linha, variação e volume/tamanho/quantidade, lendo o que está escrito na embalagem da foto.
Ao identificar produtos comerciais conhecidos do mercado brasileiro (ex: potes plásticos Gourmet/Gour Max, tintas spray Popper, balões Pic Pic, luvas Bompack, doces Yoki), use o padrão de catálogo comercial da marca. Se o produto tem apresentação típica conhecida (ex: pacote/caixa com 24 unidades, 50un, 100un), preencha "volume" e "quantidade" com essa especificação comercial confirmada.
Se não tiver certeza, registre em "duvidas". Não adivinhe.

REGRAS DE OCR E DE PREENCHIMENTO DOS CAMPOS (obrigatórias):
- Leia o rótulo com atenção máxima: transcreva exatamente as palavras impressas, respeitando acentos e grafia da marca. Não traduza, não abrevie e não corrija nomes de marca.
- Se um campo não estiver legível ou não existir, devolva STRING VAZIA (""). NUNCA escreva "Não identificado", "N/A", "Desconhecido", "null", "indefinido" ou qualquer placeholder dentro de "produto", "marca", "linha", "variacao" ou "volume".
- "produto" deve ser um nome comercial limpo e natural, do jeito que apareceria em uma loja (ex: "Pote Retangular 750ml"), sem códigos internos, sem lixo de OCR, sem letras soltas e sem símbolos estranhos.
- Não junte no mesmo campo informações de campos diferentes (marca não entra em "produto", volume não entra em "linha").
- Ignore textos irrelevantes da embalagem (validade, lote, endereço, SAC, códigos de fábrica, avisos legais) ao montar os nomes.
- Se a foto estiver borrada ou o texto ilegível, prefira campo vazio + registro em "duvidas" a chutar uma leitura.

Regra anti-redundância: No campo "produto" e "linha", NUNCA repita a mesma palavra (ex: use "Tinta Temporária Spray para Cabelo", NUNCA "Spray Tinta Spray").


Também nesta etapa:
- Transcreva em "leituraEmbalagem" cada texto legível na embalagem (marca, linha, peso, quantidade, sabor, avisos).
- Extraia em "corAcento" a cor dominante do rótulo ou da tampa, em hexadecimal (ex: #E4002B).
- Calcule "proporcao" = largura ÷ altura do produto já recortado, sem fundo (número decimal).
- Escolha "layout" baseado na proporção:
  * Menor que 0.85 (produto alto e estreito: spray, garrafa, tubo, vela, tinta) → "A"
  * Entre 0.85 e 1.25 (produto quadrado: pote, lata, caixa cúbica) → "C"
  * Maior que 1.25 (produto deitado: caixa retangular, kit, bandeja, cartela, blister) → "B"
- Liste em "termosBusca" de 3 a 5 termos exatos para procurar este produto na internet (o mais específico primeiro, incluindo marca + linha + volume/quantidade).
- Se souber com certeza o domínio oficial do fabricante, informe em "dominioOficial" (apenas o domínio, ex: "nestle.com.br"). Se não souber, deixe vazio.

Responda SOMENTE com JSON:
{
  "produto": "", "marca": "", "linha": "", "variacao": "", "volume": "",
  "leituraEmbalagem": [], "certeza": "alta|media|baixa", "duvidas": [],
  "corAcento": "#RRGGBB", "proporcao": 0.0, "layout": "A|B|C",
  "termosBusca": [], "dominioOficial": ""
}
`.trim();

export function identificacaoBlock(id?: Identificacao): string {
  if (!id) return "";
  return [
    "Identificação já confirmada na etapa anterior (use como verdade):",
    `- Produto: ${id.produto}`,
    `- Marca: ${id.marca}`,
    `- Linha: ${id.linha}`,
    `- Variação: ${id.variacao}`,
    `- Volume/tamanho: ${id.volume}`,
    `- Texto lido na embalagem: ${id.leituraEmbalagem.join(" | ")}`,
    `- Nível de certeza: ${id.certeza}`,
    `- Proporção calculada: ${id.proporcao}`,
    `- Layout escolhido: ${id.layout}`,
    `- Cor de acento: ${id.corAcento}`,
    id.duvidas.length ? `- Dúvidas em aberto: ${id.duvidas.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ───────────────────────── PASSO 2 — ANÚNCIO (MERCADO LIVRE / BLING) ───────────────────────── */

export const SCHEMA = `
${REGRAS_SKU}

Responda SOMENTE com JSON válido neste formato:
{
  "resumo": "2 a 4 frases objetivas sobre o que foi confirmado e o que ficou pendente",
  "sku": "SKU principal do produto respeitando rigorosamente as REGRAS E PADRONIZAÇÃO DE GERAÇÃO DE SKU",
  "skuPai": "SKU Pai aglutinado da família do produto (ex: POPTPC150, BPLUVNITPR100, GMPOTRET24)",
  "skuFilho": "SKU Filho completo com variação (ex: POPTPC150-AZ) ou igual ao SKU Pai se não houver variação",
  "variacoesSku": [
    { "variacao": "Nome da variação (ex: Azul, 250ml, Tam M)", "sku": "SKU filho correspondente (ex: POPTPC150-AZ)", "ean": "código EAN-13 se aplicável" }
  ],
  "nomeInterno": "nome curto e limpo para cadastro interno no Bling, ESCRITO INTEIRAMENTE EM LETRAS MAIÚSCULAS (CAPS LOCK), sem termos de busca SEO e SEM repetições de palavras (ex: SPRAY PINTA CABELO POPPER 150ML AZUL). Nunca inclua placeholders como 'Não identificado' no nome.",
  "tituloMercadoLivre": "título de alta conversão para o Mercado Livre, natural e persuasivo, até 60 caracteres, apenas com dados confirmados. REGRA ABSOLUTA: NUNCA repita a mesma palavra no título (ex: evite repetir 'Spray' no início e no fim).",
  "ncm": "código fiscal NCM exato com 8 dígitos formatado como 0000.00.00 (pesquise a classificação fiscal oficial do Mercosul baseada na categoria e composição do produto)",
  "ean": "código de barras EAN-13 (13 dígitos numéricos) se visível no produto ou informado pelo usuário",
  "descricao": "descrição comercial profissional de alta conversão estruturada em seções claras (APRESENTAÇÃO DO PRODUTO, PRINCIPAIS CARACTERÍSTICAS E BENEFÍCIOS, ESPECIFICAÇÕES TÉCNICAS, CONTEÚDO DA EMBALAGEM, MODO DE USO / CUIDADOS, PERGUNTAS FREQUENTES) apenas com dados reais confirmados. Sem emojis exagerados, sem promessas falsas, texto fluido e profissional em português do Brasil.",
  "palavrasChave": {
    "principais": ["termos exatos de maior volume de busca no Mercado Livre para este produto"],
    "relacionadas": ["termos de cauda longa, sinônimos comerciais e atributos mais pesquisados por compradores"],
    "variacoes": ["variações de busca com intenção de compra, nomes alternativos populares e categorias"]
  },
  "fichaTecnica": {
    "Produto": { "value": "", "source": "usuario|imagem|pesquisa|nao_encontrado", "note": "opcional" },
    "Marca": {...}, "Modelo": {...}, "Categoria": {...}, "NCM": { "value": "código NCM 0000.00.00", "source": "pesquisa", "note": "Classificação fiscal Mercosul" }, "EAN": {...}, "Peso": {...}, "Dimensões": {...},
    "Quantidade": {...}, "Material": {...}, "Cor": {...}, "Sabor": {...}, "Conteúdo": {...},
    "Fabricante": {...}
  },
  "caracteristicas": ["características REAIS visíveis ou confirmadas"],
  "alertas": ["conflitos entre fontes, informações que precisam ser confirmadas pelo usuário"],
  "imagens": [
    { "tipo": "principal", "titulo": "Foto Principal (Fundo Branco #FFFFFF)", "prompt": "commercial product photography of the product isolated on a pure seamless white background #FFFFFF, studio lighting, sharp focus, 1:1 square format, no added text, no watermark, no logo overlay, no fake stock-photo badge", "observacoes": "Padrão oficial para primeira foto do Mercado Livre" },
    { "tipo": "objecoes", "titulo": "Arte de Quebra de Objeções (Infográfico)", "prompt": "infographic commercial advertising banner, square 1:1, crisp vector badges, clean modern layout", "observacoes": "Infográfico com layout e cor de destaque da embalagem" },
    { "tipo": "detalhes", "titulo": "Foto de Detalhes / Textura / Rótulo", "prompt": "macro detailed photography of the product label, texture and packaging details, studio lighting, crisp 1:1 square, no added text, no watermark, no logo overlay, no fake stock-photo badge", "observacoes": "Destaque de qualidade, bico, tampa ou textura do produto" },
    { "tipo": "contexto", "titulo": "Foto em Uso / Ambiente Realista", "prompt": "lifestyle commercial advertisement photography of the product in real use context, modern clean setting, professional 1:1 square, no added text, no watermark, no logo overlay, no fake stock-photo badge", "observacoes": "Foto ambientalizada mostrando o produto em uso real" },
    { "tipo": "escala", "titulo": "Foto com Referência de Tamanho / Proporção", "prompt": "commercial product photography of the product next to a common reference object (ruler or coin) for scale comparison, pure white background #FFFFFF, studio lighting, sharp focus, square 1:1 format, no added text, no watermark, no logo overlay, no fake stock-photo badge", "observacoes": "Referência visual de escala para evitar dúvidas sobre tamanho" },
    { "tipo": "conteudo", "titulo": "Flat Lay do Conteúdo / Peças da Embalagem", "prompt": "flat lay commercial photography showing all items included in the package neatly arranged, pure white background #FFFFFF, top-down view, studio lighting, square 1:1 format, no added text, no watermark, no logo overlay, no fake stock-photo badge", "observacoes": "Exibição clara de todas as unidades/acessórios inclusos" },
    { "tipo": "festa", "titulo": "Foto Ambientada em Festa / Decoração de Mesa", "prompt": "lifestyle commercial photography of the product displayed in a festive party table or decoration setting, warm natural lighting, aesthetically pleasing, professional advertising shot, square 1:1 format, no added text, no watermark, no logo overlay, no fake stock-photo badge", "observacoes": "Composição festiva de alta conversão para artigos de festa e confeitaria" }
  ]
}
Campos da ficha sem informação: {"value": "Não identificado", "source": "nao_encontrado"}.
Responda apenas com o JSON válido, sem texto antes ou depois, sem comentários.
`.trim();

export const IMAGENS_REGRAS = `
Prompts de imagem (em inglês, fotografia comercial real, minimalista, limpa, sem cara de IA).
TODAS as imagens são obrigatoriamente QUADRADAS 1:1.
- principal: produto em fundo branco puro #FFFFFF, luz de estúdio, sombra suave, produto inteiro, centralizado, alta nitidez, padrão catálogo profissional de marketplace.
- objecoes: arte de quebra de objeções (o layout é definido no PASSO 3) — o prompt aqui deve ser apenas uma linha descrevendo a intenção.
- detalhes: close real da embalagem/produto, fundo branco, fotografia profissional macro.
- contexto: produto em uso, cena realista e adequada à finalidade, aparência de fotografia real de publicidade.
- escala: foto com referência visual de proporção (ao lado de régua, moeda ou objeto cotidiano), sem inventar números na imagem.
- conteudo: flat lay superior (top-down) em fundo branco exibindo todas as unidades ou peças inclusas no pacote/kit.
- variacoes: banner comparativo lado a lado das opções de cor/tamanho (gerar apenas quando houver múltiplas variações).
- festa: produto ambientado em mesa de aniversário, festa ou buffet temático com luz quente natural.
- medidas: diagrama técnico com setas de dimensões (gerar APENAS se as medidas reais forem confirmadas pelo usuário ou ficha).

Regra de segurança contra marca-d'água: todos os prompts das fotos realistas devem incluir expressamente:
"no added text, no watermark, no logo overlay, no fake stock-photo badge"

Todos os prompts devem exigir fidelidade total: não alterar embalagem, logotipo, textos, cores, formato, quantidade nem acessórios do produto da foto.
`.trim();

export function listingContext(listing: Listing): string {
  return JSON.stringify(
    {
      sku: listing.sku,
      skuPai: listing.skuPai,
      skuFilho: listing.skuFilho,
      nomeInterno: listing.nomeInterno,
      titulo: listing.tituloMercadoLivre,
      fichaTecnica: listing.fichaTecnica,
      caracteristicas: listing.caracteristicas,
    },
    null,
    2,
  );
}

/* ───────────────── PASSO 2 & 3 — PLANO DA IMAGEM DE OBJEÇÕES ───────────────── */

export const PASSO2_PONTOS = `
PASSO 2 — PESQUISAR
Pesquise esse produto exato na web (site do fabricante, Mercado Livre, Amazon, Shopee, perguntas de compradores, reviews).
Levante dúvidas e objeções reais de quem compra, mais as especificações confirmadas: conteúdo, quantidade de peças, material, medidas, modo de uso, compatibilidade, cuidados, restrições.
Selecione de 4 a 7 pontos, priorizando o que quebra objeção e o que NÃO se descobre olhando a foto. Ordene do mais decisivo pro menos.
Só use informação confirmada pelo rótulo da foto ou por fonte real. Se não confirmar, descarta e usa outro ponto.

Cada ponto: no máximo 5 palavras, CAIXA ALTA, com a fonte declarada ("rótulo", "usuário" ou "fabricante").
Cada ponto tem também um "icone": nome curto em inglês do pictograma de linha simples que representa aquele benefício (ex: "shield", "leaf", "ruler", "box", "clock", "check", "star", "droplet", "zap").

PASSO 3 — MEDIR O PRODUTO E ESCOLHER O LAYOUT (obrigatório)
Calcule a proporção largura ÷ altura do produto já recortado, sem fundo:
- Menor que 0.85 (produto alto e estreito: spray, garrafa, tubo, vela, tinta) → LAYOUT A
- Entre 0.85 e 1.25 (produto quadrado: pote, lata, caixa cúbica) → LAYOUT C
- Maior que 1.25 (produto deitado: caixa retangular, kit, bandeja, cartela, blister) → LAYOUT B

O produto NUNCA pode ficar distorcido, esticado, cortado ou girado para caber. O layout se adapta ao produto, nunca o contrário.

TÍTULO (3 linhas)
- linha1: tipo do produto em corpo menor, preto #141414.
- linha2: nome/linha do produto em corpo bem maior, negrito pesado, na COR DE ACENTO.
- linha3: volume, tamanho ou quantidade, mesmo corpo grande da linha 2.

COR DE ACENTO: uma única cor extraída da própria embalagem (dominante do rótulo ou da tampa), em hexadecimal.

Responda SOMENTE com JSON válido, sem texto antes ou depois, sem comentários:
{
  "proporcao": 0.0,
  "layout": "A|B|C",
  "corAcento": "#RRGGBB",
  "titulo": { "linha1": "", "linha2": "", "linha3": "" },
  "pontos": [ { "texto": "ATÉ 5 PALAVRAS EM CAIXA ALTA", "icone": "shield", "fonte": "rótulo|usuário|fabricante" } ],
  "naoConfirmado": ["o que não foi possível confirmar"]
}
`.trim();

const LAYOUT_SPECS: Record<"A" | "B" | "C", string> = {
  A: `LAYOUT A — two columns.
Cut-out product in the left column (40% of the width), vertically centered, filling almost the full height.
Right column (60%): title block on top, vertical list of bullet points below, one per line.`,
  B: `LAYOUT B — product on top, points below.
Cut-out product in the upper third, horizontally centered, using the full usable width and at most 40% of the total height.
Title right below the product, centered.
Points in a 2-column GRID on the lower half, icon on the left and text on the right in each cell, columns with identical width and aligned rows.
If there is an odd number of points, the last one spans the full width, centered.`,
  C: `LAYOUT C — product on the left, smaller; points on the right.
Cut-out product on the left taking 45% of the width and about 60% of the height, vertically centered.
Title at the top of the right column, points in a vertical list below.`,
};

/** Prompt final (inglês) da arte de quebra de objeções, a partir do plano aprovado. */
export function objectionImagePrompt(plan: ImagePlan): string {
  const pontos = plan.pontos.map((p, i) => `${i + 1}. "${p.texto}" — icon: ${p.icone}`).join("\n");
  return [
    "Create a square 1:1 e-commerce infographic image (marketplace listing art) using the reference product photo.",
    "",
    LAYOUT_SPECS[plan.layout] ?? LAYOUT_SPECS.C,
    "",
    "RULES FOR ALL LAYOUTS",
    "Pure white #FFFFFF background across the whole art. Generous and equal inner margins on all sides.",
    "Product 100% identical to the original photo: same color, shape, proportion, label, texture, packaging typography and brand.",
    "Do not redraw, do not stylize, do not fix, do not add or remove anything from the product.",
    "",
    "TITLE",
    `Line 1 (smaller, black #141414): ${plan.titulo.linha1}`,
    `Line 2 (much larger, heavy bold, accent color ${plan.corAcento}): ${plan.titulo.linha2}`,
    `Line 3 (same large size as line 2): ${plan.titulo.linha3}`,
    "",
    "POINTS (exact text, do not change, do not translate, no typos in Brazilian Portuguese)",
    pontos,
    `Each point: solid circle in the accent color ${plan.corAcento} with a simple white line pictogram inside, matching that benefit.`,
    "Text to the right of the circle, UPPERCASE, bold, black #141414, max 5 words, wrapping to 2 lines when needed.",
    "All circles with identical diameter, aligned on the same axis. Equal spacing between all items.",
    "Thin #E5E5E5 divider line between items (in layout B, only between grid rows).",
    "",
    "TYPOGRAPHY: condensed geometric sans-serif, bold, high contrast, readable on a phone screen. Straight, aligned and sharp text.",
    "",
    "ABSOLUTE PROHIBITIONS",
    "Never invent information, measurement, number, seal, certification, warranty, award, logo or benefit.",
    "No price, shipping, discount or commercial promise. No people, hands, scenery, hard shadow, frame, border or decoration.",
    "Do not alter or recreate the product. Write nothing beyond the title and the point list.",
    "",
    "ABSOLUTE RULE: the generated image MUST be square, 1:1 aspect ratio.",
  ].join("\n");
}

/** Regras aplicadas a qualquer geração de imagem (fotos de catálogo). */
export function photoImagePrompt(prompt: string): string {
  return [
    prompt,
    "",
    "Strict rules: keep the exact product from the reference photo — same packaging, same logo, same printed text, same colors, same shape, same quantity.",
    "Do not add accessories, do not invent labels or text, do not restyle the packaging.",
    "No added text, no watermark, no logo overlay, no fake stock-photo badge.",
    "Result must look like a real professional product photograph: clean, minimal, sharp, natural studio lighting, no AI-looking artifacts.",
    "ABSOLUTE RULE: the generated image MUST be square, 1:1 aspect ratio, product fully inside the frame with even margins.",
  ].join("\n");
}


/* ───────────────── MODO ECONÔMICO — SOMENTE BLING ───────────────── */

export const SCHEMA_BLING = `
${REGRAS_SKU}

MODO CADASTRO SOMENTE BLING (ERP): gere APENAS o essencial de cadastro interno. Não escreva descrição de marketing longa, não gere palavras-chave de SEO e não gere prompts de imagem.

Responda SOMENTE com JSON válido neste formato:
{
  "resumo": "1 a 2 frases sobre o que foi confirmado",
  "sku": "SKU principal seguindo as regras",
  "skuPai": "SKU Pai da família",
  "skuFilho": "SKU Filho com variação (ou igual ao Pai se não houver)",
  "variacoesSku": [ { "variacao": "", "sku": "", "ean": "" } ],
  "nomeInterno": "NOME CURTO E LIMPO PARA CADASTRO NO BLING, INTEIRAMENTE EM LETRAS MAIÚSCULAS (CAPS LOCK), SEM REPETIR PALAVRAS E SEM PLACEHOLDERS",
  "ncm": "0000.00.00",
  "ean": "EAN-13 se visível ou informado",
  "fichaTecnica": {
    "Produto": { "value": "", "source": "usuario|imagem|pesquisa|nao_encontrado" },
    "Marca": {}, "Categoria": {}, "NCM": {}, "EAN": {}, "Peso": {}, "Dimensões": {}, "Quantidade": {}, "Material": {}, "Cor": {}, "Fabricante": {}
  },
  "alertas": []
}
Campos da ficha sem informação: {"value": "Não identificado", "source": "nao_encontrado"}.
Responda apenas com o JSON válido, sem texto antes ou depois.
`.trim();
