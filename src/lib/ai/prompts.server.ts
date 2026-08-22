import type { Listing, ProductInput } from "./types";

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

export const SCHEMA = `
Responda SOMENTE com JSON válido neste formato:
{
  "resumo": "2 a 4 frases objetivas sobre o que foi confirmado e o que ficou pendente",
  "sku": "SKU curto em MAIÚSCULAS, blocos separados por hífen, apenas com dados confirmados (ex: PAC-ROLHA-1KG-100UN)",
  "nomeInterno": "nome curto para cadastro interno, sem SEO (ex: Paçoca Rolha 1kg 100un)",
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
Prompts de imagem (em inglês, estilo fotografia comercial real, minimalista, limpa, sem cara de IA):
- principal: produto em fundo branco, luz de estúdio, sombra suave, produto inteiro, centralizado, alta nitidez, catálogo.
- objecoes: fundo branco, produto em destaque e no máximo 3 marcadores de texto curtos com informações REAIS confirmadas. Nunca inventar números.
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
