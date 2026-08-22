# Anúncio Fácil Pro

Crie um aplicativo web chamado Anúncio Fácil, focado em facilitar e automatizar a criação de anúncios de produtos para marketplaces, principalmente Mercado Livre.

IMPORTANTE: neste primeiro momento NÃO quero nenhuma integração com Mercado Livre, Bling, Shopee, Amazon ou qualquer outra plataforma externa. O sistema deve apenas gerar, organizar e apresentar as informações para que eu possa copiar e colar manualmente.

O objetivo é: eu forneço uma FOTO do produto e o NOME BÁSICO do produto e o sistema deve usar inteligência artificial para pesquisar, analisar e gerar o máximo possível de informações necessárias para criar um anúncio profissional.

1. CADASTRO DO PRODUTO

A tela inicial deve ter um formulário simples e limpo.

Campos obrigatórios:

- Foto do produto

- Nome básico do produto

Campos opcionais:

- Marca

- Código de barras / EAN

- Categoria

- Custo do produto

- Peso

- Dimensões

- Quantidade de unidades

- Informações da embalagem

- Outras informações

Os campos opcionais devem ser realmente opcionais.

Se eu fornecer somente:

- foto

- nome básico

o sistema já deve tentar gerar tudo o que for possível.

A IA deve analisar visualmente a foto e tentar identificar informações como:

- marca

- modelo

- peso

- volume

- quantidade

- dimensões aparentes

- informações da embalagem

- características visíveis

- tipo de produto

- material

- cor

- sabor

- tamanho

- conteúdo

- fabricante

- outras informações relevantes

Porém, existe uma regra ABSOLUTA:

REGRA PRINCIPAL: NUNCA INVENTAR INFORMAÇÕES

A IA NUNCA deve criar, deduzir ou assumir como fato uma informação que não tenha sido encontrada ou fornecida.

Se uma informação não estiver disponível:

- não inventar;

- não estimar;

- não completar com algo provável;

- não criar números;

- não inventar especificações;

- não inventar dimensões;

- não inventar peso;

- não inventar quantidade;

- não inventar composição;

- não inventar benefícios;

- não inventar certificações;

- não inventar informações técnicas.

Quando não souber alguma informação, deve simplesmente indicar:

"Não identificado"

ou

"Informação não encontrada"

Se houver dúvida entre duas informações, não escolher uma arbitrariamente. Indicar que a informação precisa ser confirmada.

2. PESQUISA

Sempre que uma informação não puder ser obtida da foto ou dos dados fornecidos pelo usuário, o sistema deve pesquisar fontes confiáveis na internet quando houver capacidade de pesquisa disponível.

A prioridade deve ser:

1. Site oficial do fabricante

2. Site oficial da marca

3. Ficha técnica oficial

4. Distribuidores confiáveis

5. Outros sites confiáveis

Nunca utilizar uma informação encontrada em uma fonte duvidosa como se fosse certeza.

Quando houver conflito entre fontes, sinalizar o conflito para o usuário.

A IA deve diferenciar claramente:

- informação fornecida pelo usuário;

- informação identificada na imagem;

- informação encontrada em pesquisa;

- informação que não foi encontrada.

3. GERAÇÃO DO SKU

Gerar automaticamente um SKU simples, organizado e profissional.

O SKU deve ser:

- curto;

- fácil de identificar;

- único dentro do sistema;

- baseado nas informações reais do produto;

- sem caracteres desnecessários.

Exemplo:

PAC-ROLHA-1KG-100UN

Não inventar informações para montar o SKU.

Caso informações importantes não estejam disponíveis, gerar um SKU utilizando somente informações confirmadas.

4. NOME PARA O BLING

Gerar um nome simplificado para cadastro interno.

Esse nome deve ser:

- curto;

- objetivo;

- fácil de localizar;

- sem excesso de palavras-chave;

- adequado para organização interna.

Exemplo:

Paçoca Rolha 1kg 100un

O nome interno deve priorizar identificação rápida do produto, não SEO.

5. TÍTULO PARA MERCADO LIVRE

Gerar um título otimizado para marketplace.

O título deve:

- utilizar palavras-chave relevantes;

- descrever corretamente o produto;

- ser natural;

- não parecer spam;

- evitar repetição desnecessária;

- priorizar termos que compradores realmente pesquisariam;

- utilizar somente informações confirmadas.

Antes de sugerir palavras-chave, pesquisar o produto e entender como ele é chamado comercialmente.

NUNCA adicionar características apenas porque são comuns naquele tipo de produto.

6. PALAVRAS-CHAVE

Gerar uma seção chamada "Palavras-chave".

Separar as palavras-chave em grupos:

Principais

Termos diretamente relacionados ao produto.

Relacionadas

Termos relacionados à categoria, utilização e intenção de compra.

Variações de busca

Formas diferentes pelas quais compradores podem procurar o mesmo produto.

Não gerar palavras-chave aleatórias.

Não adicionar características inexistentes apenas para tentar melhorar SEO.

7. DESCRIÇÃO COMPLETA

Gerar uma descrição profissional e completa.

A descrição deve conter, quando houver informação confirmada:

- apresentação do produto;

- principais características;

- especificações;

- conteúdo da embalagem;

- quantidade;

- peso;

- dimensões;

- material;

- utilização;

- diferenciais;

- informações importantes;

- perguntas frequentes.

A descrição deve ser clara, comercial e profissional.

Evitar:

- exageros;

- promessas falsas;

- informações inventadas;

- emojis em excesso;

- linguagem artificial;

- frases genéricas de IA.

A descrição deve parecer escrita por um vendedor profissional.

8. FICHA TÉCNICA

Criar uma ficha técnica organizada com campos como:

- Produto

- Marca

- Modelo

- Categoria

- Peso

- Dimensões

- Quantidade

- Material

- Cor

- Sabor

- Conteúdo

- Fabricante

- EAN

- Outras características relevantes

Mostrar somente informações confirmadas.

Campos sem informação devem aparecer como "Não identificado".

9. INFORMAÇÕES PARA ANÚNCIO

Criar uma seção consolidada chamada "Anúncio Completo".

Ela deve apresentar tudo de forma organizada para eu poder copiar.

Cada campo deve ter um botão:

Copiar

Por exemplo:

[Título Mercado Livre]

[texto]

[Copiar]

[Descrição]

[texto]

[Copiar]

[Palavras-chave]

[texto]

[Copiar]

[SKU]

[texto]

[Copiar]

10. GERAÇÃO DE IMAGENS

Criar uma área chamada "Imagens do anúncio".

A IA deve gerar sugestões/prompts ou imagens para diferentes tipos de criativos.

O estilo visual deve ser extremamente profissional.

REGRA VISUAL PRINCIPAL

As imagens devem ser:

- minimalistas;

- limpas;

- profissionais;

- realistas;

- com aparência de fotografia comercial;

- sem aparência de imagem gerada por IA;

- sem excesso de elementos;

- sem poluição visual;

- sem efeitos desnecessários;

- sem textos enormes;

- sem designs exagerados.

Imagem principal

Produto fotografado profissionalmente.

Preferencialmente:

- fundo branco;

- iluminação de estúdio;

- sombra natural e discreta;

- produto centralizado;

- produto inteiro visível;

- alta nitidez;

- aparência de fotografia real de catálogo.

Não alterar a embalagem ou características reais do produto.

Imagem de quebra de objeções

Criar uma imagem extremamente simples.

Fundo branco.

Produto em destaque.

Ao redor do produto, pequenos elementos informativos apresentando características REAIS e CONFIRMADAS.

Exemplo:

[Produto]

• 1 kg

• 100 unidades

• Embalagem original

Somente utilizar informações comprovadas.

Não transformar a imagem em um infográfico cheio de elementos.

Imagem de detalhes

Mostrar detalhes reais do produto ou embalagem.

Fundo branco.

Visual de fotografia profissional.

Imagem em uso/contexto

Essa é a exceção ao fundo branco.

Mostrar o produto sendo utilizado em um contexto realista e apropriado para sua finalidade.

Exemplo:

um produto de festa aparecendo em uma mesa de festa real e bonita.

A cena deve parecer uma fotografia profissional real, não uma arte de IA.

O produto original deve ser preservado com máxima fidelidade.

Regra de fidelidade do produto

A IA NÃO deve:

- alterar embalagem;

- alterar logotipo;

- alterar textos;

- alterar cores;

- criar informações na embalagem;

- modificar formato;

- inventar acessórios;

- modificar quantidade;

- mudar características físicas.

O produto apresentado deve ser o mesmo produto da foto fornecida.

11. INTERFACE

A interface deve ser moderna, limpa e muito simples.

Fluxo:

Tela 1

"Novo produto"

Upload da foto.

Campo:

"Nome básico do produto"

Campos opcionais recolhidos em:

"Adicionar informações"

Botão:

Gerar produto

Tela 2

Mostrar um indicador de processamento:

Analisando produto...

Pesquisando informações...

Identificando características...

Gerando anúncio...

Preparando conteúdo...

Tela 3

Dashboard do produto.

Organizar em abas:

Resumo

SKU

Mercado Livre

Descrição

Palavras-chave

Ficha Técnica

Imagens

Cada informação deve ter botão de copiar.

12. EDIÇÃO MANUAL

Tudo que a IA gerar deve poder ser editado manualmente.

Nenhum campo deve ficar bloqueado.

O usuário deve poder corrigir qualquer informação antes de copiar.

13. REGENERAÇÃO

Cada seção deve ter um botão:

"Regenerar"

Por exemplo:

Regenerar título

Regenerar descrição

Regenerar palavras-chave

Regenerar imagem

Ao regenerar, manter as informações confirmadas do produto e não inventar novas características.

14. EXPERIÊNCIA DO USUÁRIO

O sistema deve parecer uma ferramenta profissional de trabalho, não um chatbot.

Evitar interface cheia de elementos.

Priorizar:

- velocidade;

- clareza;

- organização;

- facilidade para copiar;

- visual profissional;

- poucos cliques.

O usuário deve conseguir colocar uma foto + nome do produto e chegar rapidamente a um anúncio praticamente pronto.

15. ARQUITETURA

Estruture o projeto de maneira que a camada de inteligência artificial fique separada da interface.

Não deixar a aplicação dependente de um único modelo de IA.

Criar uma camada de serviços para funções como:

- análise de produto;

- pesquisa;

- geração de título;

- geração de descrição;

- geração de palavras-chave;

- geração de ficha técnica;

- geração de SKU;

- geração de imagens.

Isso permitirá trocar o provedor de IA posteriormente sem precisar reconstruir o aplicativo.

16. IMPORTANTE SOBRE INTEGRAÇÕES

NÃO implementar neste momento:

- Mercado Livre API

- Bling API

- Shopee API

- Amazon API

- publicação automática

- sincronização de estoque

- sincronização de preço

- emissão de nota fiscal

O sistema é SOMENTE para:

analisar → pesquisar → gerar → organizar → permitir copiar

As integrações poderão ser adicionadas posteriormente.

OBJETIVO FINAL

O resultado deve ser uma ferramenta onde eu consiga pensar:

"Tenho esse produto aqui."

Coloco a foto.

Digito:

"Paçoca rolha 1kg"

Clico em:

Gerar produto

E o sistema pesquisa e monta tudo que conseguir confirmar:

SKU

Nome interno

Título otimizado

Palavras-chave

Descrição

Ficha técnica

Características

Informações relevantes

Estrutura do anúncio

Ideias/criativos para imagens

Imagens profissionais

Tudo organizado, editável e fácil de copiar.

A prioridade absoluta do sistema é:

PRECISÃO > COMPLETUDE > CRIATIVIDADE

É preferível deixar um campo como "Não identificado" do que preencher uma informação falsa.

O sistema nunca deve inventar informações para deixar o anúncio aparentemente mais completo.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6b7e2f68-2519-42d8-bd3c-f650194cf578).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
