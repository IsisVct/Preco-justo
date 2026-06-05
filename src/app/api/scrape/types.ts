export interface ScrapeResult {
  price: number | null;
  url: string | null;
  success: boolean;
  error?: string;
}

export interface PharmacyScraper {
  scrapePrice(productUrl: string): Promise<ScrapeResult>;
}

export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};