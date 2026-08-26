import ncmTableRaw from "./ncm-table.json";

const ncmTable = ncmTableRaw as Record<string, string>;

/**
 * Limpa o código NCM removendo pontos, traços, espaços e outros caracteres não numéricos.
 */
export function cleanNcm(code: string | undefined | null): string {
  if (!code) return "";
  return code.replace(/\D/g, "");
}

/**
 * Formata um código NCM de 8 dígitos no padrão oficial: 0000.00.00
 */
export function formatNcm(code: string | undefined | null): string {
  const digits = cleanNcm(code);
  if (digits.length !== 8) return code?.trim() || "";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export interface NcmValidationResult {
  valido: boolean;
  codigoLimpo: string;
  codigoFormatado: string;
  descricaoOficial?: string;
  aviso?: string;
}

/**
 * Valida o código NCM contra a tabela oficial do Siscomex / Receita Federal.
 */
export function validarNcmOficial(code: string | undefined | null): NcmValidationResult {
  const digits = cleanNcm(code);
  if (!digits) {
    return {
      valido: false,
      codigoLimpo: "",
      codigoFormatado: "",
      aviso: "NCM não informado.",
    };
  }

  if (digits.length !== 8) {
    return {
      valido: false,
      codigoLimpo: digits,
      codigoFormatado: code?.trim() || digits,
      aviso: `Código NCM incompleto (${digits.length}/8 dígitos). O padrão oficial exige 8 dígitos.`,
    };
  }

  const descricao = ncmTable[digits];
  if (descricao) {
    return {
      valido: true,
      codigoLimpo: digits,
      codigoFormatado: formatNcm(digits),
      descricaoOficial: descricao,
    };
  }

  return {
    valido: false,
    codigoLimpo: digits,
    codigoFormatado: formatNcm(digits),
    aviso: "NCM sugerido não encontrado na tabela oficial do Siscomex/Receita Federal — confirme manualmente antes de cadastrar no Bling/Mercado Livre.",
  };
}

/**
 * Busca códigos NCM oficiais por termo ou palavra-chave (busca fuzzy simples).
 */
export function buscarNcmPorTermo(
  termo: string,
  limite: number = 5,
): Array<{ codigo: string; formatado: string; descricao: string }> {
  const cleanTerm = termo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!cleanTerm || cleanTerm.length < 3) return [];

  const words = cleanTerm.split(/\s+/).filter(Boolean);
  const results: Array<{ codigo: string; formatado: string; descricao: string; score: number }> = [];

  for (const [code, desc] of Object.entries(ncmTable)) {
    const normDesc = desc
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let matches = 0;
    for (const w of words) {
      if (normDesc.includes(w)) matches++;
    }

    if (matches > 0) {
      results.push({
        codigo: code,
        formatado: formatNcm(code),
        descricao: desc,
        score: matches,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ codigo, formatado, descricao }) => ({ codigo, formatado, descricao }));
}
