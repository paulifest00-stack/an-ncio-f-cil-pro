# Plano de Implementação — Anúncio Fácil Pro
Projeto: `annonce-genius` (workspace gustavopaulino2208's Lovable)
Objetivo: adicionar novos tipos de imagem, melhorar padronização dos prompts e integrar validação oficial de NCM — sem mexer no gerador de EAN, que já funciona como deveria.

---

## 1. NCM — Validação com a tabela oficial do Siscomex/Receita Federal

**Por quê:** hoje o NCM sai só do "conhecimento" do modelo de IA, sem checar nada. A Receita Federal disponibiliza a tabela NCM completa em JSON, oficial, grátis, sem chave de API e sem limite de uso.

**Fonte oficial (download direto):**
```
https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
```

**Como implementar:**
1. Criar um script/rotina que baixa esse JSON periodicamente (ex: 1x por mês, já que NCM muda pouco) e salva localmente em `src/lib/ncm-table.json` (ou em uma tabela no Supabase, se preferir persistir).
2. Criar uma função `buscarNcmOficial(termo: string)` em um novo arquivo `src/lib/ncm.ts` que faz busca fuzzy (por palavra-chave) nessa tabela local.
3. No fluxo de `buildListing` (`src/lib/ai/listing.server.ts`), depois que a IA sugerir um NCM, cruzar esse código com a tabela oficial:
   - Se o código existir na tabela → mostrar a descrição oficial ao lado como confirmação ("NCM confirmado na tabela oficial: [descrição]").
   - Se o código NÃO existir na tabela (a IA inventou ou errou o formato) → marcar em `alertas` como "NCM sugerido pela IA não encontrado na tabela oficial — confirme manualmente".
4. **Importante:** isso é uma camada de checagem, não substitui a sugestão da IA. A IA continua sugerindo, a tabela só confirma ou alerta.
5. Ganho extra: como a busca vira uma consulta local em JSON (sem chamada de IA), dá pra, no futuro, até pular a etapa de pedir NCM pra IA e already buscar direto na tabela por palavra-chave — economiza tokens. Mas isso é opcional, fase 2.

**Não fazer:** não remover o campo NCM do schema atual nem mudar o comportamento existente — só adicionar essa camada de confirmação em cima.

---

## 2. EAN — manter como está

Sem alterações. O gerador (`generateValidEan13("789")` em `src/lib/ean.ts`) já é usado exatamente como o Gustavo quer: só preenche o campo quando o produto não tem código de fábrica, pra permitir sincronizar Bling/Mercado Livre. Comportamento atual já está correto — não mexer.

---

## 3. Novos tipos de imagem a adicionar

Hoje o sistema gera 4 tipos fixos em `defaultImagesForProduct` (`src/lib/ai/listing.server.ts`) e no `SCHEMA` (`src/lib/ai/prompts.server.ts`): principal, objeções, detalhes, contexto.

Adicionar os seguintes tipos novos ao `ImageBrief["tipo"]` (em `src/lib/ai/types.ts`) e replicar a lógica de prompt condicional (kit vs. unidade) que já existe pros outros 4:

### 3.1 `escala` — Foto com referência de tamanho
- Objetivo: mostrar o produto ao lado de um objeto comum (régua, moeda, xícara) pra dar noção real de tamanho.
- Prompt sugerido (inglês, seguindo o padrão dos outros): `commercial product photography of [produto] next to a common reference object (ruler or coin) for scale comparison, pure white background #FFFFFF, studio lighting, sharp focus, square 1:1 format`
- Regra: só gerar objeto de referência genérico, nunca inventar medida numérica na imagem (mantém a REGRA_OURO).

### 3.2 `conteudo` — Flat lay do conteúdo/kit
- Objetivo: mostrar tudo que vem na embalagem (essencial pros kits e produtos com acessórios).
- Prompt sugerido: `flat lay commercial photography showing all items included in the package of [produto] neatly arranged and organized, pure white background #FFFFFF, top-down view, studio lighting, square 1:1 format`
- Para kits, reaproveitar a lógica já existente de `kitQuantity` pra especificar a quantidade exata de itens no flat lay.

### 3.3 `variacoes` — Banner de variações
- Objetivo: mostrar lado a lado as opções de cor/tamanho/sabor do produto.
- **Só gerar esse tipo de imagem se `listing.variacoesSku` tiver mais de 1 item** — não faz sentido pra produto sem variação.
- Prompt sugerido: montar dinamicamente listando as variações de `variacoesSku`, ex: `product variation comparison banner showing [N] color/size options of [produto] side by side, labeled clearly, pure white background #FFFFFF, square 1:1 format`

### 3.4 `festa` — Foto contextualizada de festa/decoração
- Objetivo: já que o catálogo é de artigos de festa/embalagens, uma foto do produto num contexto de mesa de aniversário ou decoração temática converte mais que uma foto lifestyle genérica.
- Prompt sugerido: `lifestyle commercial photography of [produto] displayed in a festive party table or decoration setting, warm natural lighting, aesthetically pleasing, professional advertising shot, square 1:1 format`
- Pode ser uma variação mais específica do tipo `contexto` já existente, ou um tipo novo separado — decisão de UX (se quiser deixar o usuário escolher qual dos dois gerar).

### 3.5 `medidas` — Diagrama de medidas
- Objetivo: setas indicando altura/largura/profundidade com os números reais do produto.
- **Regra crítica: só gerar esse tipo se `input.dimensions` ou a ficha técnica tiver a dimensão CONFIRMADA** (não gerar se for "Não identificado") — senão estaria inventando número em cima de imagem, o que quebra a REGRA_OURO.
- Prompt sugerido: `technical diagram of [produto] with dimension arrows showing width, height and depth labeled with the exact measurements: [dimensões], clean minimal line-art style over product photo, white background, square 1:1 format`

**Importante para todos os novos tipos:** manter a mesma disciplina de fidelidade que já existe no `photoImagePrompt()` — nunca alterar embalagem, logotipo, texto, cor ou formato do produto original.

---

## 4. Ajustes de padronização nos prompts (ganhos menores, mas válidos)

### 4.1 Unificar a definição dos tipos de imagem
Hoje a lista de tipos de imagem existe duplicada: uma vez dentro do `SCHEMA` (`prompts.server.ts`) como exemplo pra IA, e outra vez em `defaultImagesForProduct` (`listing.server.ts`) como fallback determinístico. Ao adicionar os 5 novos tipos do item 3, criar uma única fonte de verdade (ex: um array `TIPOS_DE_IMAGEM` exportado de `types.ts` com id, título padrão e template de prompt), e fazer tanto o `SCHEMA` quanto o `defaultImagesForProduct` consumirem dessa mesma fonte — evita os dois desalinharem no futuro.

### 4.2 Proteção contra texto/marca-d'água indesejada nas fotos "realistas"
Adicionar essa linha fixa nos prompts dos tipos `principal`, `detalhes`, `contexto`, `escala`, `conteudo` e `festa` (todos exceto o infográfico de objeções, que já tem regra própria de texto):
```
"no added text, no watermark, no logo overlay, no fake stock-photo badge"
```
Isso evita que o modelo de imagem escreva algo aleatório na foto por conta própria.

### 4.3 Temperatura diferenciada por tipo de chamada
Em `src/lib/ai/gateway.server.ts`, a função `chat()` usa `temperature: 0.2` fixo pra tudo. Sugestão: manter 0.2 pras chamadas que exigem precisão (identificação da foto, ficha técnica, SKU, NCM) e usar algo em torno de 0.4 só na chamada que gera título e descrição (mais criatividade permitida ali sem comprometer a regra de não inventar dado factual).

### 4.4 Lembrete de validade de JSON no final dos prompts
Adicionar uma linha final nos prompts que pedem JSON (PASSO1, PASSO2_PONTOS, SCHEMA) tipo: `"Responda apenas com o JSON válido, sem texto antes ou depois, sem comentários."` — reforça o que o parser já tenta corrigir via regex, reduzindo a chance de erro de formatação.

---

## 5. Ordem de prioridade sugerida

1. **NCM com validação oficial** (item 1) — maior ganho de confiabilidade, fonte grátis.
2. **Novos tipos de imagem** (item 3) — maior ganho de completude do anúncio.
3. **Unificação da definição de imagens** (item 4.1) — facilita adicionar os novos tipos sem duplicar código.
4. **Proteção contra texto indesejado** (item 4.2) — rápido de aplicar, baixo risco.
5. **Temperatura diferenciada e lembrete de JSON** (itens 4.3 e 4.4) — refinamentos finos, podem ficar por último.

---

## 6. O que NÃO muda
- Gerador de EAN (`src/lib/ean.ts`) — mantido exatamente como está.
- Campo NCM continua sendo gerado pela IA normalmente — só ganha uma camada de confirmação por cima.
- Os 4 tipos de imagem originais (principal, objeções, detalhes, contexto) continuam existindo — os novos são adicionais, não substitutos.
