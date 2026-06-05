import * as cheerio from 'cheerio';
import { PharmacyScraper, ScrapeResult, DEFAULT_HEADERS } from './types';
import { isProductCompatible } from '@/lib/medicineMatcher';

export interface PagueMenosResult extends ScrapeResult {
    isLabDiscount?: boolean;
}

function parseQtyAndForm(text: string) {
    const lower = text.toLowerCase().replace(/-/g, ' ');

    const qtyMatch = lower.match(/(?:com|cx|caixa|cpr|caps?|comp?|drg|drageas?|\s|^)(\d+)\s*(?:comprimidos?|c[aá]psulas?|dr[aá]geas?|caps?|comp?|cpr|cp|drg)s?/);
    if (qtyMatch) {
        return {
            quantity: parseInt(qtyMatch[1], 10),
            unit: 'caps/comp'
        };
    }

    const volMatch = lower.match(/(?:\s|^)(\d+)\s*(?:ml|g|gotas?)/);
    if (volMatch) {
        return {
            quantity: parseInt(volMatch[1], 10),
            unit: 'volume'
        };
    }

    return {
        quantity: null,
        unit: null
    };
}

export class PagueMenosScraper implements PharmacyScraper {
    async scrapePrice(productUrl: string): Promise<PagueMenosResult> {
        try {
            const lowerUrl = productUrl.toLowerCase();
            if (lowerUrl.includes('1044139') || lowerUrl.includes('cortador-de-compridos') || lowerUrl.includes('cortador-de-comprimidos')) {
                return { success: false, price: null, url: productUrl, error: "Product blacklisted as accessory" };
            }

            let price: number | null = null;
            let isLabDiscount = false;
            let exactProductUrl = productUrl;

            let searchTerm = '';
            const searchMatch = productUrl.match(/[?&](termo|q|query|w)=([^&]+)/);
            if (searchMatch) {
                searchTerm = decodeURIComponent(searchMatch[2].replace(/\+/g, ' ')).trim();
            } else {
                const pathMatch = productUrl.match(/\.br\/([^/]+)(?:\/p|$)/);
                if (pathMatch) searchTerm = pathMatch[1].replace(/-/g, ' ').trim();
            }

            if (searchTerm) {
                try {
                    const performVtexSearch = async (term: string): Promise<any[]> => {
                        try {
                            const apiUrl = `https://www.paguemenos.com.br/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}`;
                            const apiRes = await fetch(apiUrl, { headers: DEFAULT_HEADERS, cache: 'no-store' });
                            return apiRes.ok ? await apiRes.json() : [];
                        } catch {
                            return [];
                        }
                    };

                    let data = await performVtexSearch(searchTerm);

                    if (!data || data.length === 0) {
                        const words = searchTerm.split(/\s+/).filter(Boolean);
                        if (words.length > 2) {
                            const broaderTerm = words.slice(0, 2).join(' ');
                            data = await performVtexSearch(broaderTerm);
                        }
                    }

                    if (data && data.length > 0) {
                        const NOISE_WORDS = new Set(['de', 'do', 'da', 'em', 'com', 'para', 'um', 'uma', 'os', 'as', 'o', 'a', 'x', 'por']);
                        const termWords = searchTerm
                            .toLowerCase()
                            .split(/[\s\-]+/)
                            .filter((w: string) => w.length > 0 && !NOISE_WORDS.has(w));

                        const PHARMACY_STOP_WORDS = new Set([
                            'comprimidos', 'comprimido', 'cápsulas', 'cápsula', 'capsulas', 'capsula',
                            'drágeas', 'drágea', 'drageas', 'dragea', 'gotas', 'gota', 'solução', 'solucao',
                            'oral', 'injetável', 'injetavel', 'ampola', 'ampolas', 'xarope', 'creme',
                            'pomada', 'gel', 'spray', 'adesivo', 'envelopes', 'envelope', 'kit', 'kits',
                            'unidade', 'unidades', 'und', 'frasco', 'frascos', 'sache', 'saches', 'sachê', 'sachês'
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

                        const rawSearchTerm = searchTerm.toLowerCase();
                        const substanceGroups = rawSearchTerm.split(/[+;]/).map(s => s.trim()).filter(Boolean);
                        const isCompoundSearch = substanceGroups.length > 1;
                        const substanceKeywords = isCompoundSearch
                            ? substanceGroups.map(group =>
                                group.split(/\s+/).filter(w =>
                                    w.length > 2 &&
                                    !PHARMACY_STOP_WORDS.has(w) &&
                                    !/^\d+$/.test(w) &&
                                    !/^(mg|ml|g|mcg|ui)$/.test(w)
                                )[0]
                            ).filter(Boolean)
                            : null;

                        let validProducts = [...data];

                        validProducts = validProducts.filter((p: any) => {
                            const pName = (p.productName ?? '').toLowerCase();
                            const pUrl = (p.link ?? p.url ?? '').toLowerCase();
                            if (pUrl.includes('1044139') || pUrl.includes('cortador-de-compridos') || pUrl.includes('cortador-de-comprimidos')) {
                                return false;
                            }
                            const startsWithAccessory = /^(agulha|tira|fita|lanceta|aparelho|monitor|seringa|cortador|porta|triturador|esmagador|bolsa|dosador|copo|medidor|kit\s+\d+)/.test(pName);
                            const containsAccessoryFor = /(agulha|tira|fita|lanceta|seringa|cortador|porta|triturador|esmagador|bolsa|dosador|copo|medidor)s?\s+para\b/.test(pName);
                            return !(startsWithAccessory || containsAccessoryFor);
                        });

                        validProducts = validProducts.filter((p: any) => {
                            const pName = (p.productName ?? '').toLowerCase();
                            if (isCompoundSearch && substanceKeywords && substanceKeywords.length > 1) {
                                if (!substanceKeywords.every(kw => pName.includes(kw))) return false;
                            } else {
                                if (!criticalWords.some(word => pName.includes(word))) return false;
                            }
                            return isProductCompatible(searchTerm, p.productName ?? '').compatible;
                        });

                        if (validProducts.length > 0) {
                            const target = parseQtyAndForm(searchTerm);

                            validProducts.forEach((p: any) => {
                                const pName = p.productName.toLowerCase();
                                p.matchScore = termWords.reduce((score: number, word: string) => score + (pName.includes(word) ? 1 : 0), 0);
                                const parsed = parseQtyAndForm(pName);
                                p.qtyDiff = target.quantity !== null && parsed.quantity !== null
                                    ? Math.abs(target.quantity - parsed.quantity)
                                    : target.quantity === null && parsed.quantity === null ? 0 : 9999;
                                p.unitMatches = target.unit === parsed.unit;
                            });

                            const maxScore = Math.max(...validProducts.map((p: any) => p.matchScore || 0));
                            if (maxScore > 0) {
                                validProducts = validProducts.filter((p: any) => p.matchScore === maxScore);
                            }

                            validProducts.sort((a: any, b: any) => {
                                if (a.qtyDiff !== b.qtyDiff) return a.qtyDiff - b.qtyDiff;
                                if (a.unitMatches !== b.unitMatches) return a.unitMatches ? -1 : 1;
                                const getBestPrice = (prod: any) => {
                                    const normal = prod.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 9999;
                                    const pbmStr = prod.MenorPrecoPBM?.[0];
                                    const pbm = pbmStr ? parseFloat(pbmStr) : null;
                                    if (pbm && pbm > 0 && pbm < normal) return pbm;
                                    return normal;
                                };
                                return getBestPrice(a) - getBestPrice(b);
                            });

                            const product = validProducts[0];
                            if (product) {
                                const offerPrice = product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price;
                                const pbmPriceStr = product.MenorPrecoPBM?.[0];
                                const pbmPrice = pbmPriceStr ? parseFloat(pbmPriceStr) : null;

                                if (pbmPrice && pbmPrice > 0 && (!offerPrice || pbmPrice < offerPrice)) {
                                    price = pbmPrice;
                                    isLabDiscount = true;
                                } else if (offerPrice) {
                                    price = offerPrice;
                                }

                                if (price) {
                                    if (product.link) {
                                        exactProductUrl = product.link.replace(/.*\.vtexcommercestable\.com\.br/, 'https://www.paguemenos.com.br');
                                    }
                                    return { success: true, price, url: exactProductUrl, isLabDiscount };
                                }
                            }
                        }

                    }
                } catch { }
            }

            const res = await fetch(productUrl, { headers: DEFAULT_HEADERS, cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const html = await res.text();
            const $ = cheerio.load(html);

            const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                $('meta[name="product:price:amount"]').attr('content');
            if (metaPrice) {
                const parsed = parseFloat(metaPrice);
                if (!isNaN(parsed) && parsed > 0) {
                    price = parsed;
                }
            }

            if (price === null) {
                $('script[type="application/ld+json"]').each((_, el) => {
                    if (price !== null) return;
                    try {
                        const data = JSON.parse($(el).html() || '{}');

                        const extractPriceFromLd = (obj: any): number | null => {
                            if (!obj || typeof obj !== 'object') return null;
                            if (obj.offers) {
                                const offers = obj.offers;
                                if (Array.isArray(offers)) {
                                    for (const off of offers) {
                                        const p = parseFloat(off.price);
                                        if (!isNaN(p) && p > 0) return p;
                                    }
                                } else {
                                    const p = parseFloat(offers.price);
                                    if (!isNaN(p) && p > 0) return p;
                                }
                            }
                            if (obj.price && !isNaN(parseFloat(obj.price))) {
                                return parseFloat(obj.price);
                            }
                            return null;
                        };

                        const val = extractPriceFromLd(data);
                        if (val) price = val;
                    } catch { }
                });
            }

            return {
                success: price !== null,
                price,
                url: exactProductUrl,
                isLabDiscount: false,
                ...(price === null ? { error: "Product not found" } : {})
            };
        } catch (error: any) {
            return { success: false, price: null, url: productUrl, error: error.message };
        }
    }
}