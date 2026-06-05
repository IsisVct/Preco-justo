export interface ParsedMedicineName {
  dosage: string | null;
  quantity: number | null;
  form: string | null;
  isGeneric: boolean;
  laboratory: string | null;
}

export function parseMedicineString(rawName: string): ParsedMedicineName {
  const lowerName = rawName.toLowerCase();

  const dosageMatch = lowerName.match(/(\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|ml|ui))/i);
  const dosage = dosageMatch ? dosageMatch[1].replace(/\s+/g, '') : null;

  const qtyFormMatch = lowerName.match(/(\d+)\s*(comprimidos?|c[aá]psulas?|dr[aá]geas?|ml|g|gotas?|envelopes?|ampolas?|seringas?|doses?)/i);
  let quantity = null;
  let form = null;
  if (qtyFormMatch) {
    quantity = parseInt(qtyFormMatch[1], 10);
    form = qtyFormMatch[2].toLowerCase();
    if (form.includes('comprimido')) form = 'comprimidos';
    if (form.includes('capsula') || form.includes('cápsula')) form = 'cápsulas';
    if (form.includes('dragea') || form.includes('drágea')) form = 'drágeas';
  }

  const isGeneric = lowerName.includes('genérico') || lowerName.includes('generico');

  return {
    dosage,
    quantity,
    form,
    isGeneric,
    laboratory: null,
  };
}

/** Agrupa resultados e retorna o menor preço por variação. */
export function groupAndFindCheapest(scrapedItems: any[]) {
  const groups = new Map<string, any>();

  for (const item of scrapedItems) {
    const parsed = parseMedicineString(item.name);
    const key = `${parsed.dosage || 'nd'}-${parsed.quantity || 'nd'}-${parsed.form || 'nd'}-${parsed.isGeneric ? 'gen' : 'ref'}`;
    const existing = groups.get(key);
    const currentPrice = item.price;
    
    if (!existing || currentPrice < existing.price) {
      groups.set(key, {
        ...item,
        parsedData: parsed
      });
    }
  }

  return Array.from(groups.values());
}

export interface ParsedPackageInfo {
  quantity: number;
  unit: string;
  isHospitalOrWholesale: boolean;
  shouldCompareUnit: boolean;
}

export function parsePackageInfo(description: string): ParsedPackageInfo {
  const desc = description.toUpperCase();
  
  // Ex: "CX 200 FR PLAS OPC GOT X 10 ML" -> qty = 200, unitType = "FR"
  // Ex: "CX 50 AMP DE 2 ML" -> qty = 50, unitType = "AMP"
  const cxMatch = desc.match(/CX\s+(\d+)\s*([A-Z]{2,4})?/);
  
  let quantity = 1;
  let unit = 'unidade';
  let isHospitalOrWholesale = false;
  let shouldCompareUnit = false;
  
  const hasHospitalKeyword = desc.includes('HOSP') || desc.includes('EMB HOSP') || desc.includes('MULTIPLA') || desc.includes('MÚLTIPLA');
  
  if (cxMatch) {
    const qty = parseInt(cxMatch[1], 10);
    const unitType = cxMatch[2] || '';
    
    if (qty >= 50 || hasHospitalKeyword) {
      quantity = qty;
      isHospitalOrWholesale = true;
      if (unitType) {
        unit = unitType.toLowerCase();
      }
    }
  } else if (hasHospitalKeyword) {
    isHospitalOrWholesale = true;
  }
  

  if (unit.startsWith('fr')) {
    unit = 'frasco';
    if (isHospitalOrWholesale) shouldCompareUnit = true;
  } else if (unit.startsWith('amp')) {
    unit = 'ampola';
    if (isHospitalOrWholesale) shouldCompareUnit = true;
  } else if (unit.startsWith('ser')) {
    unit = 'seringa';
    if (isHospitalOrWholesale) shouldCompareUnit = true;
  } else if (unit.startsWith('bis') || unit.startsWith('bg')) {
    unit = 'bisnaga';
    if (isHospitalOrWholesale) shouldCompareUnit = true;
  } else if (unit.startsWith('com') || unit.startsWith('bl')) {
    unit = 'comprimido';
  } else if (unit.startsWith('cap')) {
    unit = 'cápsula';
  } else if (unit.startsWith('dr')) {
    unit = 'drágea';
  }
  
  return {
    quantity,
    unit,
    isHospitalOrWholesale,
    shouldCompareUnit
  };
}

export interface ParsedProductDetails {
  dosages: string[];
  volume: number | null;
  quantity: number | null;
  isLiquid: boolean;
  isSolid: boolean;
}

export function parseProductDetails(text: string): ParsedProductDetails {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extrai dosagens como 500mg/ml, 50mg/ml, 500mg, 1g, 1000mg, 0.25mg
  const dosageMatches = lower.match(/\b\d+(?:[.,]\d+)?\s*(?:mg\/ml|mg\/g|mg|mcg|ui|g)\b/g) || [];
  const dosages = dosageMatches.map(d => d.replace(/\s+/g, ''));

  // Extrai volumes em ml (ex: 10ml, 20ml, 100ml)
  const mlMatches = lower.match(/\b(\d+(?:[.,]\d+)?)\s*ml\b/g) || [];
  let volume: number | null = null;
  for (const match of mlMatches) {
    const val = parseFloat(match.replace(/\s+/g, '').replace('ml', ''));
    const idx = lower.indexOf(match);
    if (idx > 3) {
      const context = lower.slice(idx - 3, idx);
      if (context.includes('mg/') || context.includes('/')) {
        continue; // parte da dosagem (ex: 500mg/ml)
      }
    }
    volume = val;
    break;
  }

  // Extrai quantidade em comprimidos, cápsulas, etc.
  const qtyMatch = lower.match(/\b(\d+)\s*(?:comprimido|cápsula|capsula|dragea|envelope|sache|ampola|seringa|gota)s?\b/) 
    || lower.match(/(?:com|cx|caixa|cpr|caps?|comp?|drg|drageas?|\s|^)(\b\d+\b)\s*(?:comprimidos?|c[aá]psulas?|dr[aá]geas?|caps?|comp?|cpr|cp|drg)s?/);
  const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : null;

  // Classificação da forma farmacêutica
  const isLiquid = /\b(?:gotas?|solucao|xarope|oral|ml|injetavel|ampolas?|frascos?)\b/.test(lower);
  const isSolid = /\b(?:comprimidos?|capsulas?|drageas?|cpr|cp|comp?|saches?|envelopes?)\b/.test(lower);

  return {
    dosages,
    volume,
    quantity,
    isLiquid,
    isSolid
  };
}

export function isProductCompatible(query: string, candidateName: string): { compatible: boolean; reason?: string } {
  const qInfo = parseProductDetails(query);
  const cInfo = parseProductDetails(candidateName);

  // 1. Incompatibilidade de dosagem/concentração
  if (qInfo.dosages.length > 0 && cInfo.dosages.length > 0) {
    const primaryQDosage = qInfo.dosages[0];
    const normalizeDosage = (d: string) => d.toLowerCase().replace('1g', '1000mg').replace('1.0g', '1000mg');
    const normQ = normalizeDosage(primaryQDosage);
    const hasMatch = cInfo.dosages.some(d => normalizeDosage(d) === normQ);
    if (!hasMatch) {
      return { 
        compatible: false, 
        reason: `Dosagem incompatível: ${primaryQDosage} no alvo vs ${cInfo.dosages.join(', ')} no candidato` 
      };
    }
  }

  // 2. Incompatibilidade de forma (Líquido vs Sólido)
  if (qInfo.isLiquid && !qInfo.isSolid && cInfo.isSolid && !cInfo.isLiquid) {
    return { compatible: false, reason: 'Forma incompatível: alvo é líquido e candidato é sólido' };
  }
  if (qInfo.isSolid && !qInfo.isLiquid && cInfo.isLiquid && !cInfo.isSolid) {
    return { compatible: false, reason: 'Forma incompatível: alvo é sólido e candidato é líquido' };
  }

  return { compatible: true };
}

