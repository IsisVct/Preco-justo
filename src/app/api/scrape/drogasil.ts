import * as cheerio from 'cheerio';
import { PharmacyScraper, ScrapeResult } from './types';

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            },
            cache: 'no-store',
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchBypassingWAF(targetUrl: string): Promise<Response> {
    const separator = targetUrl.includes('?') ? '&' : '?';
    const cacheBusterUrl = `${targetUrl}${separator}cb=${Date.now()}`;

    const attempts: Promise<Response>[] = [
        fetchWithTimeout(targetUrl, 8000),
        fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(cacheBusterUrl)}`, 10000),
        fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cacheBusterUrl)}`, 10000),
    ];

    try {
        return await Promise.any(attempts);
    } catch {
        throw new Error('Todas as tentativas falharam ou expiraram o tempo limite.');
    }
}

function isValidProductUrl(url: string): boolean {
    if (!url) return false;
    const invalid = [
        '/agendamento/', '/servicos', 'serviceCode=', 'category=service',
        '/search', '/busca', '/categoria', '/departamento'
    ];
    return (
        (url.endsWith('.html') || url.includes('.html?')) &&
        !invalid.some(pattern => url.includes(pattern))
    );
}

function parseBRPrice(text: string): number | null {
    const cleaned = text.replace(/[^\d,]/g, '');
    const normalized = cleaned.replace(',', '.');
    const val = parseFloat(normalized);
    return isNaN(val) || val <= 0 ? null : val;
}

function extractBasePriceFromHtml($: cheerio.CheerioAPI): number | null {
    const isPDP = $('#pdp-price-container').length > 0 || $('.product-price').length > 0;

    if (isPDP) {
        const headerPrice = parseBRPrice($('.product-price').first().text());
        if (headerPrice) return headerPrice;

        let ofertaPrice: number | null = null;
        $('#pdp-price-container').each((_, container) => {
            if ($(container).closest('#pdp-floating-price-container').length > 0) return;
            const headerText = $(container).find('#pdp-price-header').text().toLowerCase();

            const isLabDiscount =
                headerText.includes('laboratório') ||
                headerText.includes('laboratorio') ||
                headerText.includes('pbm') ||
                headerText.includes('cpf');

            if (!isLabDiscount) {
                const priceText = $(container).find('.price-pdp-content').first().text();
                const val = parseBRPrice(priceText);
                if (val && (!ofertaPrice || val < ofertaPrice)) ofertaPrice = val;
            }
        });
        if (ofertaPrice) return ofertaPrice;

        let singlePrice: number | null = null;
        $('#pdp-price-container .price-pdp-content').each((_, el) => {
            if ($(el).closest('#pdp-floating-price-container').length > 0) return;
            const val = parseBRPrice($(el).text());
            if (val && (!singlePrice || val < singlePrice)) singlePrice = val;
        });
        if (singlePrice) return singlePrice;

        return null;
    } else {
        let cardPrice: number | null = null;
        $('[data-testid="price-discount"]').each((_, el) => {
            const prices = $(el).find('[data-testid="price"]');
            if (prices.length >= 2) {
                const val = parseBRPrice($(prices[1]).text());
                if (val && (!cardPrice || val < cardPrice)) cardPrice = val;
            }
        });
        return cardPrice;
    }
}

function findLowestPrice(obj: any): number | null {
    if (!obj) return null;
    let lowest = Infinity;

    const discountKeys = [
        'salePrice', 'priceWithDiscount', 'discountPrice',
        'sellingPrice', 'spotPrice', 'bestPrice', 'cashPrice', 'clubPrice',
        'appPrice', 'stixPrice', 'laboratoryDiscountPrice',
        'subscriptionPrice', 'priceToPayWithDiscount', 'priceWithDiscountAndCashback'
    ];
    const fullPriceKeys = [
        'price', 'priceService', 'priceValue', 'laboratoryPrice', 'listPrice'
    ];

    let hasDiscountKey = false;
    for (const key of discountKeys) {
        if (obj[key] != null) {
            const val = parseFloat(obj[key]);
            if (!isNaN(val) && val > 0 && val < lowest) { lowest = val; hasDiscountKey = true; }
        }
    }
    if (!hasDiscountKey) {
        for (const key of fullPriceKeys) {
            if (obj[key] != null) {
                const val = parseFloat(obj[key]);
                if (!isNaN(val) && val > 0 && val < lowest) lowest = val;
            }
        }
    }

    const nestedPaths: [string, string][] = [
        ['offers', 'price'], ['offers', 'salePrice'],
        ['priceInfo', 'discountedPrice'], ['priceInfo', 'price'],
        ['offer', 'price'], ['offer', 'discountPrice'],
        ['prices', 'discountedPrice'], ['prices', 'salePrice'],
    ];
    for (const [parent, child] of nestedPaths) {
        const val = parseFloat(obj?.[parent]?.[child]);
        if (!isNaN(val) && val > 0 && val < lowest) lowest = val;
    }

    return lowest === Infinity ? null : lowest;
}

export class DrogasilScraper implements PharmacyScraper {
    async scrapePrice(productUrl: string): Promise<ScrapeResult> {
        try {
            const lowerUrl = productUrl.toLowerCase();
            if (lowerUrl.includes('1044139') || lowerUrl.includes('cortador-de-compridos') || lowerUrl.includes('cortador-de-comprimidos')) {
                return { success: false, price: null, url: productUrl, error: "Product blacklisted as accessory" };
            }

            let exactProductUrl = productUrl;

            let termoBusca = 'medicamento';
            const searchMatch = productUrl.match(/[?&](w|q)=([^&]+)/);
            if (searchMatch) {
                termoBusca = decodeURIComponent(searchMatch[2].replace(/\+/g, ' ')).trim();
            } else {
                const urlPathMatch = productUrl.match(/\.br\/([^/]+)(?:\.html|\/p|$)/);
                if (urlPathMatch) termoBusca = urlPathMatch[1].replace(/-/g, ' ').trim();
            }

            const domain = productUrl.includes('drogaraia') ? 'drogaraia.com.br' : 'drogasil.com.br';

            if (isValidProductUrl(productUrl)) {
                try {
                    const res = await fetchBypassingWAF(exactProductUrl);
                    if (res.ok) {
                        const html = await res.text();
                        const $ = cheerio.load(html);
                        const price = extractBasePriceFromHtml($);
                        if (price) return { success: true, price, url: exactProductUrl };
                    }
                } catch { }
            }

            try {
                const performSearch = async (term: string): Promise<any[]> => {
                    try {
                        const searchUrl = `https://www.${domain}/search?w=${encodeURIComponent(term)}`;
                        const searchRes = await fetchBypassingWAF(searchUrl);
                        if (!searchRes.ok) return [];

                        const html = await searchRes.text();
                        const $ = cheerio.load(html);
                        const nextDataStr = $('#__NEXT_DATA__').html();
                        if (!nextDataStr) return [];

                        const nextData = JSON.parse(nextDataStr);
                        let products: any[] = [];

                        const extractProducts = (obj: any) => {
                            if (!obj || typeof obj !== 'object') return;
                            if (
                                Array.isArray(obj) && obj.length > 0 &&
                                obj[0].name && obj[0].url &&
                                isValidProductUrl(obj[0].url)
                            ) {
                                products = [...products, ...obj];
                            }
                            if (obj.products && Array.isArray(obj.products)) {
                                products = [...products, ...obj.products];
                            }
                            for (const key in obj) {
                                if (key !== 'products') extractProducts(obj[key]);
                            }
                        };
                        extractProducts(nextData);
                        return products.filter(p => isValidProductUrl(p.url ?? ''));
                    } catch {
                        return [];
                    }
                };

                let foundProducts = await performSearch(termoBusca);

                if (foundProducts.length === 0) {
                    const words = termoBusca.split(/\s+/).filter(Boolean);
                    if (words.length > 2) {
                        const broaderTerm = words.slice(0, 2).join(' ');
                        foundProducts = await performSearch(broaderTerm);
                    }
                }

                if (foundProducts.length > 0) {
                    const NOISE_WORDS = new Set(['de', 'do', 'da', 'em', 'com', 'para', 'um', 'uma', 'os', 'as', 'o', 'a', 'x', 'por']);
                    const termWords = termoBusca
                        .toLowerCase()
                        .split(/[\s\-,+\/]+/)
                        .filter((w: string) => w.length > 0 && !NOISE_WORDS.has(w));

                    const PHARMACY_STOP_WORDS = new Set([
                        'comprimidos', 'comprimido', 'cápsulas', 'cápsula', 'capsulas', 'capsula',
                        'drágeas', 'drágea', 'drageas', 'dragea', 'gotas', 'gota', 'solução', 'solucao',
                        'oral', 'injetável', 'injetavel', 'ampola', 'ampolas', 'xarope', 'creme',
                        'pomada', 'gel', 'spray', 'adesivo', 'envelopes', 'envelope', 'kit', 'kits'
                    ]);

                    const criticalWords = termWords.filter(w => {
                        if (PHARMACY_STOP_WORDS.has(w)) return false;
                        if (/^\d+$/.test(w)) return false;
                        if (/^(mg|ml|g|mcg|ui)$/.test(w)) return false;
                        return true;
                    });

                    if (criticalWords.length === 0 && termWords.length > 0) {
                        criticalWords.push(termWords[0]);
                    }

                    let validProducts = foundProducts.filter(p => !p.name?.toLowerCase().includes('kit'));

                    validProducts = validProducts.filter(p => {
                        const pName = (p.name ?? '').toLowerCase();
                        const pUrl = (p.url ?? '').toLowerCase();

                        if (pUrl.includes('1044139') || pUrl.includes('cortador-de-compridos') || pUrl.includes('cortador-de-comprimidos')) {
                            return false;
                        }

                        const startsWithAccessory = /^(agulha|tira|fita|lanceta|aparelho|monitor|seringa|cortador|porta|triturador|esmagador|bolsa|dosador|copo|medidor|kit\s+\d+)/.test(pName);
                        const containsAccessoryFor = /(agulha|tira|fita|lanceta|seringa|cortador|porta|triturador|esmagador|bolsa|dosador|copo|medidor)s?\s+para\b/.test(pName);
                        return !(startsWithAccessory || containsAccessoryFor);
                    });

                    validProducts = validProducts.filter(p => {
                        const pName = (p.name ?? '').toLowerCase();
                        return criticalWords.some(word => pName.includes(word));
                    });

                    if (validProducts.length === 0) {
                        return { success: false, price: null, url: exactProductUrl, error: "Product not found" };
                    }

                    validProducts.forEach(p => {
                        const pName = (p.name ?? '').toLowerCase();
                        p.matchScore = termWords.reduce(
                            (score: number, word: string) => score + (pName.includes(word) ? 1 : 0), 0
                        );
                    });

                    const maxScore = Math.max(...validProducts.map(p => p.matchScore || 0));

                    validProducts = validProducts.filter(p => p.matchScore === maxScore);

                    validProducts.sort((a: any, b: any) =>
                        (findLowestPrice(a) || 9999) - (findLowestPrice(b) || 9999)
                    );

                    const bestProduct = validProducts[0];
                    const rawUrl = bestProduct.url ?? '';
                    exactProductUrl = rawUrl.startsWith('/')
                        ? `https://www.${domain}${rawUrl.split('?')[0]}`
                        : rawUrl.split('?')[0];

                    try {
                        const pdpRes = await fetchBypassingWAF(exactProductUrl);
                        if (pdpRes.ok) {
                            const pdpHtml = await pdpRes.text();
                            const $pdp = cheerio.load(pdpHtml);
                            const price = extractBasePriceFromHtml($pdp);
                            if (price) return { success: true, price, url: exactProductUrl };
                        }
                    } catch { }

                    const jsonPrice = findLowestPrice(bestProduct);
                    if (jsonPrice) return { success: true, price: jsonPrice, url: exactProductUrl };
                }
            } catch { }

            return { success: false, price: null, url: exactProductUrl, error: "Product not found" };
        } catch (error: any) {
            return { success: false, price: null, url: productUrl, error: error.message };
        }
    }
}