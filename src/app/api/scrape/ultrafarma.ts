import * as cheerio from 'cheerio';
import { PharmacyScraper, ScrapeResult, DEFAULT_HEADERS } from './types';

export interface UltrafarmaResult extends ScrapeResult {
    priceDe: number | null;
    discountPercent: number | null;
    pricePix: number | null;
}

export class UltrafarmaScraper implements PharmacyScraper {
    async scrapePrice(productUrl: string): Promise<UltrafarmaResult> {
        try {
            const lowerUrl = productUrl.toLowerCase();
            if (lowerUrl.includes('1044139') || lowerUrl.includes('cortador-de-compridos') || lowerUrl.includes('cortador-de-comprimidos')) {
                return {
                    success: false,
                    url: productUrl,
                    price: null,
                    priceDe: null,
                    discountPercent: null,
                    pricePix: null,
                    error: "Product blacklisted as accessory"
                };
            }

            const res = await fetch(productUrl, { headers: DEFAULT_HEADERS, cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const html = await res.text();
            const $ = cheerio.load(html);

            const leanMatch = html.match(/LeanEcommerce\.PDP_PRODUTO\s*=\s*\{[\s\S]*?Preco\s*:\s*JSON\.parse\('(\{[^']+\})'\)/);
            if (leanMatch) {
                try {
                    const preco = JSON.parse(leanMatch[1]);
                    return {
                        success: true,
                        url: productUrl,
                        price: preco.PrecoPor ?? null,
                        priceDe: preco.PrecoDe ?? null,
                        discountPercent: preco.PorcentagemDesconto ?? null,
                        pricePix: preco.PrecoPix ?? null,
                    };
                } catch { }
            }

            let foundPrice: number | null = null;
            let foundPriceDe: number | null = null;
            let foundDiscount: number | null = null;
            let foundPricePix: number | null = null;

            $('script[type="application/ld+json"]').each((_, el) => {
                if (foundPrice !== null) return;
                try {
                    const data = JSON.parse($(el).html() || '{}');
                    const offerPrice = data?.offers?.price;
                    if (offerPrice && !isNaN(parseFloat(offerPrice))) {
                        foundPrice = parseFloat(offerPrice);
                    }
                } catch { }
            });

            if (foundPrice === null) {
                const items: any[] = [];
                $('[data-product-price]').each((_, el) => {
                    const priceAttr = $(el).attr('data-product-price');
                    const nameAttr = $(el).attr('data-product-name');
                    const priceVal = priceAttr ? parseFloat(priceAttr) : NaN;
                    const nameVal = nameAttr ? nameAttr.trim() : '';
                    let urlVal = $(el).find('a').first().attr('href') || '';
                    if (urlVal && urlVal.startsWith('/')) {
                        urlVal = `https://www.ultrafarma.com.br${urlVal}`;
                    }

                    if (!isNaN(priceVal) && nameVal) {
                        items.push({ name: nameVal, price: priceVal, url: urlVal });
                    }
                });

                if (items.length > 0) {
                    let termoBusca = 'medicamento';
                    const searchMatch = productUrl.match(/[?&](q|w)=([^&]+)/);
                    if (searchMatch) {
                        termoBusca = decodeURIComponent(searchMatch[2].replace(/\+/g, ' ')).trim();
                    } else {
                        const urlPathMatch = productUrl.match(/\.br\/([^/]+)(?:\.html|\/p|$)/);
                        if (urlPathMatch) termoBusca = urlPathMatch[1].replace(/-/g, ' ').trim();
                    }

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

                    const rawTermoBusca = termoBusca.toLowerCase();
                    const substanceGroupsUF = rawTermoBusca.split(/[+;]/).map((s: string) => s.trim()).filter(Boolean);
                    const isCompoundSearchUF = substanceGroupsUF.length > 1;
                    const substanceKeywordsUF = isCompoundSearchUF
                        ? substanceGroupsUF.map((group: string) =>
                            group.split(/\s+/).filter((w: string) =>
                                w.length > 2 &&
                                !PHARMACY_STOP_WORDS.has(w) &&
                                !/^\d+$/.test(w) &&
                                !/^(mg|ml|g|mcg|ui)$/.test(w)
                            )[0]
                        ).filter(Boolean)
                        : null;

                    let validItems = items.filter(item => {
                        const iName = item.name.toLowerCase();
                        const pUrl = (item.url ?? '').toLowerCase();

                        if (pUrl.includes('1044139') || pUrl.includes('cortador-de-compridos') || pUrl.includes('cortador-de-comprimidos')) {
                            return false;
                        }

                        const startsWithAccessory = /^(agulha|tira|fita|lanceta|aparelho|monitor|seringa|cortador|porta|triturador|esmagador|bolsa|dosador|copo|medidor|kit\s+\d+)/.test(iName);
                        const containsAccessoryFor = /(agulha|tira|fita|lanceta|seringa|cortador|porta|triturador|esmagador|bolsa|dosador|copo|medidor)s?\s+para\b/.test(iName);
                        return !(startsWithAccessory || containsAccessoryFor);
                    });

                    validItems = validItems.filter(item => {
                        const iName = item.name.toLowerCase();
                        if (isCompoundSearchUF && substanceKeywordsUF && substanceKeywordsUF.length > 1) {
                            return substanceKeywordsUF.every((kw: string) => iName.includes(kw));
                        }
                        return criticalWords.some(word => iName.includes(word));
                    });

                    if (validItems.length > 0) {
                        validItems.forEach(item => {
                            const iName = item.name.toLowerCase();
                            item.matchScore = termWords.reduce(
                                (score: number, word: string) => score + (iName.includes(word) ? 1 : 0), 0
                            );
                        });

                        const maxScore = Math.max(...validItems.map(item => item.matchScore || 0));
                        const bestItems = validItems.filter(item => item.matchScore === maxScore);

                        bestItems.sort((a, b) => a.price - b.price);

                        const bestItem = bestItems[0];
                        foundPrice = bestItem.price;
                        if (bestItem.url) productUrl = bestItem.url;
                    }
                }
            }

            if (foundDiscount === null) {
                const discountText = $('.tag-discount span, .discount').first().text().trim();
                const discountMatch = discountText.match(/(\d+)\s*%/);
                if (discountMatch) foundDiscount = parseInt(discountMatch[1], 10);
            }

            if (foundPriceDe === null) {
                const deAttr = $('[data-preco-prefixo="false"][data-preco]').first().attr('data-preco');
                if (deAttr) {
                    const val = parseFloat(deAttr.replace(/\./g, '').replace(',', '.'));
                    if (!isNaN(val)) foundPriceDe = val;
                }
            }

            if (foundPriceDe === null && foundPrice !== null && foundDiscount !== null) {
                foundPriceDe = parseFloat((foundPrice / (1 - foundDiscount / 100)).toFixed(2));
            }

            if (foundPricePix === null && foundPrice !== null) {
                foundPricePix = parseFloat((foundPrice * 0.97).toFixed(2));
            }

            return {
                success: foundPrice !== null,
                url: productUrl,
                price: foundPrice,
                priceDe: foundPriceDe,
                discountPercent: foundDiscount,
                pricePix: foundPricePix,
            };

        } catch (error: any) {
            return {
                success: false,
                url: productUrl,
                price: null,
                priceDe: null,
                discountPercent: null,
                pricePix: null,
                error: error.message,
            };
        }
    }
}