/**
 * Gera a URL de busca para um medicamento em cada farmácia parceira.
 * Se uma URL direta do produto for fornecida (pharmacyPrice.url), ela tem prioridade.
 * Caso contrário, gera um link de busca com o nome do medicamento.
 *
 * Padrões verificados manualmente acessando cada site:
 * - Ultrafarma  → /busca?q=  ✅
 * - Drogasil    → /search?w= ✅ (não usa /busca?q=)
 * - Pague Menos → /busca?q=  ✅
 */

const PHARMACY_SEARCH_PATTERNS: Record<string, (q: string) => string> = {
  Ultrafarma:         (q) => `https://www.ultrafarma.com.br/busca?q=${q}`,
  Drogasil:           (q) => `https://www.drogasil.com.br/search?w=${q}`,
  'Pague Menos':      (q) => `https://www.paguemenos.com.br/busca?q=${q}`,
  'Farmácia Popular': () => `https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/f/farmacia-popular`,
};

/**
 * Retorna a URL mais adequada para o produto:
 * 1. URL direta do produto (se existir em pharmacyPrice.url)
 * 2. URL de busca gerada dinamicamente com o nome do medicamento
 * 3. Site oficial da farmácia como fallback
 *
 * @param pharmacyName  - Nome da farmácia (deve bater com a chave em PHARMACY_SEARCH_PATTERNS)
 * @param medicineName  - Nome do medicamento para compor a query
 * @param directUrl     - URL direta do produto (campo `url` em PharmacyPrice), opcional
 * @param fallbackSite  - Site oficial da farmácia (campo `website` em TrustedPharmacy)
 */
export function getPharmacyProductUrl(
  pharmacyName: string,
  medicineName: string,
  directUrl?: string,
  fallbackSite?: string,
): string {
  // Prioridade 1: link direto do produto cadastrado manualmente
  if (directUrl) return directUrl;

  // Prioridade 2: link de busca gerado pelo nome do medicamento
  const pattern = PHARMACY_SEARCH_PATTERNS[pharmacyName];
  if (pattern) {
    const encoded = encodeURIComponent(medicineName);
    return pattern(encoded);
  }

  // Fallback: site oficial da farmácia
  return fallbackSite ?? '#';
}
