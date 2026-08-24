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
  const pairs: [string, string | undefined][] = [
    ["Nome básico", input.basicName],
    ["Marca", input.brand],
    ["EAN/Código de barras", input.ean],
    ["Categoria", input.category],
    ["Custo", input.cost],
    ["Peso", input.weight],
    ["Dimensões", input.dimensions],
    ["Quantidade de unidades", input.units],
    ["Embalagem", input.packaging],
    ["Outras informações", input.other],
  ];
  return pairs
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v!.trim()}`)
    .join("\n");
}

/* ───────────────────────── PASSO 1 — IDENTIFICAR ───────────────────────── */

export const PASSO1 = `
PASSO 1 — IDENTIFICAR
Descubra exatamente qual é o produto: marca, linha, variação e volume/tamanho/quantidade, lendo literalmente o que está escrito na embalagem da foto.
Não adivinhe. Se não tiver certeza de algum item, deixe-o vazio e registre em "duvidas".

Também nesta etapa:
- Transcreva em "leituraEmbalagem" cada texto legível na embalagem (marca, linha, peso, quantidade, sabor, avisos).
- Extraia em "corAcento" a cor dominante do rótulo ou da tampa, em hexadecimal.
- Calcule "proporcao" = largura ÷ altura do produto já recortado, sem fundo (número decimal).
- Escolha "layout": proporcao < 0.85 → "A"; entre 0.85 e 1.25 → "C"; > 1.25 → "B".
- Liste em "termosBusca" de 3 a 5 termos exatos para procurar este produto na internet (o mais específico primeiro, incluindo marca + linha + volume).
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
    id.duvidas.length ? `- Dúvidas em aberto: ${id.duvidas.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ───────────────────────── PASSO 2 — ANÚNCIO ───────────────────────── */

export const SCHEMA = `
Responda SOMENTE com JSON válido neste formato:
{
  "resumo": "2 a 4 frases objetivas sobre o que foi confirmado e o que ficou pendente",
  "sku": "SKU curto em MAIÚSCULAS, blocos separados por hífen, apenas com dados confirmados (ex: PAC-ROLHA-1KG-100UN)",
  "nomeInterno": "nome curto para cadastro interno no Bling, sem SEO (ex: Paçoca Rolha 1kg 100un)",
  "tituloMercadoLivre": "título otimizado, natural, até 60 caracteres, só com dados confirmados",
  "descricao": "descrição comercial profissional em texto puro, com seções (apresentação, características, especificações, conteúdo da embalagem, utilização, informações importantes, perguntas frequentes) apenas quando houver dado confirmado. Sem emojis excessivos, sem promessas, sem frases genéricas de IA",
  "palavrasChave": { "principais": [], "relacionadas": [], "variacoes": [] },
  "fichaTecnica": {
    "Produto": { "value": "", "source": "usuario|imagem|pesquisa|nao_encontrado", "note": "opcional" },
    "Marca": {...}, "Modelo": {...}, "Categoria": {...}, "Peso": {...}, "Dimensões": {...},
    "Quantidade": {...}, "Material": {...}, "Cor": {...}, "Sabor": {...}, "Conteúdo": {...},
    "Fabricante": {...}, "EAN": {...}
  },
  "caracteristicas": ["características REAIS visíveis ou confirmadas"],
  "alertas": ["conflitos entre fontes, informações que precisam ser confirmadas pelo usuário"],
  "imagens": [
    { "tipo": "principal", "titulo": "", "prompt": "prompt fotográfico em inglês", "observacoes": "" },
    { "tipo": "objecoes", "titulo": "", "prompt": "", "observacoes": "" },
    { "tipo": "detalhes", "titulo": "", "prompt": "", "observacoes": "" },
    { "tipo": "contexto", "titulo": "", "prompt": "", "observacoes": "" }
  ]
}
Campos da ficha sem informação: {"value": "Não identificado", "source": "nao_encontrado"}.
`.trim();

export const IMAGENS_REGRAS = `
Prompts de imagem (em inglês, fotografia comercial real, minimalista, limpa, sem cara de IA).
TODAS as imagens são obrigatoriamente QUADRADAS 1:1.
- principal: produto em fundo branco puro #FFFFFF, luz de estúdio, sombra suave, produto inteiro, centralizado, alta nitidez, padrão catálogo.
- objecoes: arte de quebra de objeções (o layout é definido em etapa própria) — o prompt aqui deve ser apenas uma linha descrevendo a intenção.
- detalhes: close real da embalagem/produto, fundo branco, fotografia profissional.
- contexto: única exceção ao fundo branco — produto em uso, cena realista e adequada à finalidade, aparência de fotografia real.
Todos os prompts devem exigir fidelidade total: não alterar embalagem, logotipo, textos, cores, formato, quantidade nem acessórios do produto da foto.
`.trim();

export function listingContext(listing: Listing): string {
  return JSON.stringify(
    {
      sku: listing.sku,
      nomeInterno: listing.nomeInterno,
      titulo: listing.tituloMercadoLivre,
      fichaTecnica: listing.fichaTecnica,
      caracteristicas: listing.caracteristicas,
    },
    null,
    2,
  );
}

/* ───────────────── PASSO 3 — PLANO DA IMAGEM DE OBJEÇÕES ───────────────── */

export const PASSO2_PONTOS = `
PASSO 2 — LEVANTAR PONTOS DE QUEBRA DE OBJEÇÃO
Considere o que se sabe deste produto exato (rótulo da foto, dados do usuário e conhecimento público confiável do fabricante/marketplaces).
Levante dúvidas e objeções reais de quem compra, mais as especificações confirmadas: conteúdo, quantidade de peças, material, medidas, modo de uso, compatibilidade, cuidados, restrições.
Selecione de 4 a 7 pontos, priorizando o que quebra objeção e o que NÃO se descobre olhando a foto. Ordene do mais decisivo para o menos.
Só use informação confirmada pelo rótulo da foto ou por fonte real. Se não confirmar, descarte e use outro ponto.
Cada ponto: no máximo 5 palavras, CAIXA ALTA, com a fonte declarada ("rótulo", "usuário" ou "fabricante").
Cada ponto tem também um "icone": nome curto em inglês do pictograma de linha simples que representa aquele benefício (ex: "shield", "leaf", "ruler", "box", "clock").

PASSO 3 — MEDIR O PRODUTO E ESCOLHER O LAYOUT
Confirme a proporção largura ÷ altura do produto recortado e o layout correspondente:
- < 0.85 (alto e estreito: spray, garrafa, tubo) → LAYOUT A
- 0.85 a 1.25 (quadrado: pote, lata, caixa cúbica) → LAYOUT C
- > 1.25 (deitado: caixa retangular, kit, cartela, blister) → LAYOUT B
O produto NUNCA pode ser distorcido, esticado, cortado ou girado para caber. O layout se adapta ao produto.

TÍTULO (3 linhas)
- linha1: tipo do produto (corpo menor)
- linha2: nome/linha do produto (corpo maior, negrito, na cor de acento)
- linha3: volume, tamanho ou quantidade

COR DE ACENTO: uma única cor extraída da própria embalagem (dominante do rótulo ou da tampa), em hexadecimal.

Responda SOMENTE com JSON:
{
  "proporcao": 0.0,
  "layout": "A|B|C",
  "corAcento": "#RRGGBB",
  "titulo": { "linha1": "", "linha2": "", "linha3": "" },
  "pontos": [ { "texto": "ATÉ 5 PALAVRAS", "icone": "shield", "fonte": "rótulo|usuário|fabricante" } ],
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
    "Result must look like a real professional product photograph: clean, minimal, sharp, natural studio lighting, no AI-looking artifacts.",
    "ABSOLUTE RULE: the generated image MUST be square, 1:1 aspect ratio, product fully inside the frame with even margins.",
  ].join("\n");
}
