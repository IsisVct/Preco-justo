import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { DrogasilScraper } from './drogasil';
import { UltrafarmaScraper } from './ultrafarma';
import { PagueMenosScraper } from './paguemenos';
import { DEFAULT_HEADERS } from './types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PHARMACY_DOMAINS: Record<string, string> = {
  'Ultrafarma': 'ultrafarma.com.br',
  'Drogasil': 'drogasil.com.br',
  'Pague Menos': 'paguemenos.com.br',
};

const SCRAPERS = {
  'Ultrafarma': new UltrafarmaScraper(),
  'Drogasil': new DrogasilScraper(),
  'Pague Menos': new PagueMenosScraper(),
};

function isValidDiscoveryUrl(url: string, domain: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();

  const ignoredPatterns = [
    '/busca', '/search', '/categoria', '/departamento', '/bulas/', '/bula/',
    '/institucional', '/atendimento', '/trabalhe-conosco', '/nossas-lojas',
    '/agendamento', '/servicos', '/marcas/', '/regulamento', '/c/', '/d/',
    '/politica-de-privacidade', '/termos-de-uso', '/recompra', '/lp/'
  ];

  if (ignoredPatterns.some(pattern => lowerUrl.includes(pattern))) {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname === '/' || parsed.pathname === '') return false;
  } catch {
    return false;
  }

  if (domain.includes('drogasil.com.br') || domain.includes('drogaraia.com.br')) {
    return lowerUrl.endsWith('.html') || lowerUrl.includes('.html?');
  }

  if (domain.includes('ultrafarma.com.br')) {
    return true;
  }

  if (domain.includes('paguemenos.com.br')) {
    return /\/p(\?|$)/.test(lowerUrl);
  }

  return true;
}

function brandToSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function findExactProductUrl(
  pharmacyDomain: string,
  medicineName: string,
  brandSlug?: string
): Promise<string | null> {
  const query = `site:${pharmacyDomain} ${medicineName}`;
  const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, { headers: DEFAULT_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    let exactUrl: string | null = null;

    $('.algo-sr').each((i, el) => {
      const href = $(el).find('a').attr('href');
      if (!href) return;

      let realUrl = href;
      if (href.includes('RU=')) {
        const urlMatch = href.match(/RU=([^/]+)\//);
        if (urlMatch) {
          try {
            realUrl = decodeURIComponent(urlMatch[1]);
          } catch { }
        }
      }

      if (realUrl.includes(pharmacyDomain) && !exactUrl) {
        if (isValidDiscoveryUrl(realUrl, pharmacyDomain)) {
          if (brandSlug && !realUrl.toLowerCase().includes(brandSlug)) {
            return;
          }
          exactUrl = realUrl;
        }
      }
    });
    return exactUrl;
  } catch {
    return null;
  }
}

function simplifyQueryForUltrafarma(name: string): string {
  const words = name.split(/\s+/);
  const cleanWords: string[] = [];

  const stopWords = new Set([
    'comprimidos', 'comprimido', 'cápsulas', 'cápsula', 'capsulas', 'capsula',
    'drágeas', 'drágea', 'drageas', 'dragea', 'gotas', 'gota', 'solução', 'solucao',
    'oral', 'injetável', 'injetavel', 'ampola', 'ampolas', 'xarope', 'creme',
    'pomada', 'gel', 'spray', 'adesivo', 'envelopes', 'envelope', 'kit', 'kits'
  ]);

  for (const word of words) {
    const lower = word.toLowerCase();
    if (stopWords.has(lower)) continue;

    if (/^\d+(?:[.,]\d+)?(?:mg|g|ml|mcg|ui|mg\/ml)$/i.test(lower)) {
      const numOnly = lower.replace(/(?:mg|g|ml|mcg|ui|mg\/ml)$/i, '');
      if (numOnly) cleanWords.push(numOnly);
      continue;
    }

    if (/^(mg|g|ml|mcg|ui|mg\/ml)$/i.test(lower)) {
      continue;
    }

    cleanWords.push(word);
  }

  if (cleanWords.length > 1 && /^\d+$/.test(cleanWords[cleanWords.length - 1])) {
    const hasAnotherNumber = cleanWords.slice(0, -1).some(w => /\d/.test(w));
    if (hasAnotherNumber) {
      cleanWords.pop();
    }
  }

  return cleanWords.join(' ').trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pharmacy = searchParams.get('pharmacy');
  const medicineName = searchParams.get('medicine');
  const brandNameParam = searchParams.get('brand') || '';
  let exactUrl = searchParams.get('url');

  if (!pharmacy || !medicineName) {
    return NextResponse.json({ error: 'Pharmacy and medicine are required' }, { status: 400 });
  }

  const scraper = SCRAPERS[pharmacy as keyof typeof SCRAPERS];
  const domain = PHARMACY_DOMAINS[pharmacy];

  if (!scraper || !domain) {
    return NextResponse.json({ error: 'Pharmacy not supported' }, { status: 400 });
  }

  const brandSlug = brandNameParam ? brandToSlug(brandNameParam) : undefined;

  try {
    const isSearchOrHome = !exactUrl ||
      exactUrl.includes('/busca') ||
      exactUrl.includes('/search') ||
      exactUrl === `https://www.${domain}` ||
      exactUrl === `https://www.${domain}/` ||
      exactUrl === `https://${domain}` ||
      exactUrl === `https://${domain}/`;

    if (isSearchOrHome) {
      const discoveredUrl = await findExactProductUrl(domain, medicineName, brandSlug);
      if (discoveredUrl) {
        exactUrl = discoveredUrl;
      } else if (pharmacy === 'Ultrafarma') {
        const simplifiedQuery = simplifyQueryForUltrafarma(medicineName);
        exactUrl = `https://www.ultrafarma.com.br/busca?q=${encodeURIComponent(simplifiedQuery)}`;
      }
    }

    if (!exactUrl) {
      return NextResponse.json({ success: false, error: 'Could not find exact product URL' }, { status: 404 });
    }

    if (brandSlug && !exactUrl.toLowerCase().includes(brandSlug)) {
      return NextResponse.json({
        success: false,
        error: `Brand not found: product URL does not match brand "${brandNameParam}"`
      }, { status: 404 });
    }

    let result = await scraper.scrapePrice(exactUrl);

    if (!result.success && pharmacy === 'Drogasil') {
      await new Promise(r => setTimeout(r, 1500));
      result = await scraper.scrapePrice(exactUrl);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`Error processing ${pharmacy}:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
