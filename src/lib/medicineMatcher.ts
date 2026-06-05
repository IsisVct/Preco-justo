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

