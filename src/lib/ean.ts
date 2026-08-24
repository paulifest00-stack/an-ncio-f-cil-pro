/**
 * Utilitários para Geração e Validação de Código de Barras EAN-13 (Padrão GS1 Brasil)
 */

/**
 * Calcula o dígito verificador (13º dígito) pelo algoritmo oficial Módulo 10 da GS1
 */
export function calculateEanCheckDigit(digits12: string): number {
  const clean = digits12.replace(/\D/g, "").slice(0, 12);
  if (clean.length !== 12) {
    throw new Error("São necessários exatamente 12 dígitos para calcular o checksum EAN-13.");
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    // Posições ímpares (índice 0, 2, 4...) peso 1; pares (índice 1, 3, 5...) peso 3
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Gera um código EAN-13 matematicamente válido com prefixo brasileiro (789 ou 790)
 */
export function generateValidEan13(prefix: "789" | "790" | string = "789"): string {
  const cleanPrefix = prefix.replace(/\D/g, "") || "789";
  
  // Gera os dígitos restantes até completar 12 dígitos
  let payload = cleanPrefix;
  while (payload.length < 12) {
    payload += Math.floor(Math.random() * 10).toString();
  }

  const checkDigit = calculateEanCheckDigit(payload);
  return `${payload}${checkDigit}`;
}

/**
 * Valida se uma string é um código EAN-13 válido
 */
export function validateEan13(ean: string): boolean {
  const clean = ean.replace(/\D/g, "");
  if (clean.length !== 13) return false;
  
  const payload = clean.slice(0, 12);
  const checkDigit = parseInt(clean[12], 10);
  
  return calculateEanCheckDigit(payload) === checkDigit;
}

/**
 * Formata um código EAN-13 para exibição legível (ex: 789 1234 56789 0)
 */
export function formatEan13(ean: string): string {
  const clean = ean.replace(/\D/g, "");
  if (clean.length !== 13) return ean;
  return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 12)} ${clean.slice(12)}`;
}
