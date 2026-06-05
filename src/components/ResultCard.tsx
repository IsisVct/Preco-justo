'use client';
import { useState, useEffect } from 'react';
import { Medicine } from '@/data/medicines';
import { animate } from 'framer-motion';
import { SusAvailabilityBadge } from '@/components/SusAvailabilityBadge';
import { PriceComparisonTable } from '@/components/PriceComparisonTable';
import { checkFarmaciaPopular } from '@/lib/farmaciaPopular';
import { parsePackageInfo } from '@/lib/medicineMatcher';


interface ResultCardProps {
  selectedMedicine: Medicine;
}

const ICMS_RATES: Record<string, number> = {
  SP: 18, MG: 18, RJ: 20, PR: 19, SC: 17, RS: 17, 
  BA: 19, PE: 20.5, DF: 18, CE: 20, AM: 20, GO: 17,
  OUTROS: 18
};

function getSmartSearchQuery(medicine: Medicine) {
  // Regra especial para o Ozempic da CMED para bater com as farmácias
  if (medicine.name.toLowerCase().includes('ozempic')) {
    const descLower = (medicine.description || '').toLowerCase();
    if (descLower.includes('4 agulhas') || descLower.includes('4-agulhas')) {
      return 'Ozempic 1mg';
    } else if (descLower.includes('6 agulhas') || descLower.includes('6-agulhas')) {
      return 'Ozempic 0.25mg 0.5mg';
    }
    return 'Ozempic';
  }

  const parts = [medicine.name];
  if (medicine.description) {
     // Ignora partes da descrição após o "+" para evitar ruído de múltiplas dosagens em fórmulas compostas
     const mainDesc = medicine.description.split('+')[0];
     const words = mainDesc.split(/\s+/);
     const importantWords = words.filter(w => {
        const lower = w.toLowerCase();
        if (/\d/.test(lower)) return true; // has number
        if (['mg', 'ml', 'g', 'mcg', 'ui', 'mg/ml'].includes(lower)) return true;
        if (['comprimidos', 'cápsulas', 'gotas', 'xarope', 'solução', 'drágeas'].includes(lower)) return true;
        return false;
     });
     parts.push(...importantWords);
  }

  // Adiciona a forma e quantidade estruturadas do banco para diferenciar dosagens/formas (ex: comprimidos vs gotas)
  if (medicine.form) {
    parts.push(medicine.form);
  }
  if (medicine.quantity) {
    parts.push(String(medicine.quantity));
  }

  const seen = new Set();
  const finalParts: string[] = [];
  for (const part of parts.join(' ').split(/\s+/)) {
      if (!part) continue;
      const lower = part.toLowerCase();
      if (!seen.has(lower)) {
          seen.add(lower);
          finalParts.push(part);
      }
  }
  return finalParts.join(' ').trim();
}

export function ResultCard({ selectedMedicine }: ResultCardProps) {
  const [selectedState, setSelectedState] = useState<string>('SP');
  const [displayPrice, setDisplayPrice] = useState(0);

  const basePrice18 = selectedMedicine.maxPrice;
  let currentIcms = ICMS_RATES[selectedState];
  
  // Regra tributária de São Paulo (SP): Medicamentos genéricos têm alíquota reduzida de 12% no ICMS da tabela da CMED
  if (selectedState === 'SP' && selectedMedicine.isGeneric) {
    currentIcms = 12;
  }
  
  const priceWithoutTax = basePrice18 / 1.18;
  const maxPrice = priceWithoutTax * (1 + currentIcms / 100);

  // Parse package details
  const packageInfo = parsePackageInfo(selectedMedicine.description || '');
  const unitMaxPrice = packageInfo.shouldCompareUnit 
    ? maxPrice / packageInfo.quantity 
    : maxPrice;

  const defaultPharmacies = [
    { name: 'Ultrafarma', price: unitMaxPrice },
    { name: 'Drogasil', price: unitMaxPrice },
    { name: 'Pague Menos', price: unitMaxPrice }
  ];

  // Dynamic Farmacia Popular detection for CMED medicines
  const fpData = checkFarmaciaPopular(selectedMedicine.activeIngredient);
  
  // Build final SusAvailability (favor explicitly mocked data if exists, otherwise use dynamic)
  const finalSusAvailability = selectedMedicine.susAvailability || (fpData ? {
    sus: true,
    farmaciapopular: true,
    note: fpData.note
  } : undefined);

  const displayPharmacies = selectedMedicine.pharmacyPrices && selectedMedicine.pharmacyPrices.length > 0 
    ? [...selectedMedicine.pharmacyPrices]
    : [...defaultPharmacies];

  // Se tem Farmácia Popular detectada dinamicamente, insere ela caso já não esteja lá
  if (fpData && !displayPharmacies.find(p => p.name === 'Farmácia Popular')) {
     displayPharmacies.push({
         name: 'Farmácia Popular',
         price: fpData.type === 'free' ? 0 : unitMaxPrice * 0.1 // Copay is roughly 10% of max price
     });
  }

  useEffect(() => {
    const targetPrice = packageInfo.shouldCompareUnit ? unitMaxPrice : maxPrice;
    const controls = animate(0, targetPrice, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (value) => {
        setDisplayPrice(value);
      }
    });
    return controls.stop;
  }, [maxPrice, unitMaxPrice, packageInfo.shouldCompareUnit]);

  return (
    <>
      <div className="w-full max-w-3xl mt-16 p-[1px] rounded-[24px] bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="bg-[#0c0c0e] p-8 rounded-[23px] flex flex-col space-y-6 relative overflow-hidden">
          
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] opacity-20 transition-colors duration-1000 bg-primary"></div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-white">{selectedMedicine.name}</h3>
              <p className="text-zinc-400 mt-1">
                {selectedMedicine.activeIngredient} • {selectedMedicine.laboratory} • {selectedMedicine.description}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-1">Seu Estado</label>
                <select 
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer transition-colors hover:border-zinc-700"
                >
                  {Object.keys(ICMS_RATES).map(uf => {
                    const rate = uf === 'SP' && selectedMedicine.isGeneric ? 12 : ICMS_RATES[uf];
                    return (
                      <option key={uf} value={uf}>
                        {uf} ({rate}%)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="bg-zinc-900/80 backdrop-blur-md px-5 py-3 rounded-xl border border-zinc-800 text-center shadow-2xl shrink-0">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-1">Teto ANVISA</p>
                <p className="text-3xl font-bold text-white tabular-nums">
                  R$ {displayPrice.toFixed(2).replace('.', ',')}
                  {packageInfo.shouldCompareUnit && (
                    <span className="text-sm font-bold text-orange-400 ml-1">/ {packageInfo.unit}</span>
                  )}
                </p>
                {packageInfo.shouldCompareUnit && (
                  <span className="block text-[10px] text-zinc-500 font-medium mt-0.5">
                    Caixa fechada: R$ {maxPrice.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badge SUS / Farmacia Popular */}
          {finalSusAvailability && (
            <div className="relative z-10">
              <SusAvailabilityBadge availability={finalSusAvailability} />
            </div>
          )}

          {/* Alerta embalagem hospitalar */}
          {packageInfo.shouldCompareUnit && (
            <div className="relative z-10 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-200 text-sm">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold">Embalagem Hospitalar/Atacado Detectada</p>
                <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                  O teto ANVISA original de <strong>R$ {maxPrice.toFixed(2).replace('.', ',')}</strong> corresponde à caixa fechada contendo <strong>{packageInfo.quantity} {packageInfo.unit}s</strong>. Como as farmácias vendem unidades individuais, calculamos o teto proporcional unitário de <strong>R$ {unitMaxPrice.toFixed(2).replace('.', ',')}</strong> para a comparação abaixo.
                </p>
              </div>
            </div>
          )}

          {/* Alerta quantidade grande / multipack */}
          {packageInfo.isHospitalOrWholesale && !packageInfo.shouldCompareUnit && (
            <div className="relative z-10 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-200 text-sm">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold">Embalagem Múltipla ou Atacado ({packageInfo.quantity} {packageInfo.unit}s)</p>
                <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                  O teto legal de <strong>R$ {maxPrice.toFixed(2).replace('.', ',')}</strong> corresponde a uma embalagem múltipla ou lote com <strong>{packageInfo.quantity} unidades</strong>. Como as farmácias de varejo vendem caixas individuais menores (ex: 30 unidades), a comparação direta de porcentagem abaixo fica distorcida em relação ao valor total da caixa grande.
                </p>
              </div>
            </div>
          )}

          <hr className="border-zinc-800/80 relative z-10" />

          {/* Tabela de preços */}
          <div className="relative z-10">
            <PriceComparisonTable
              pharmacyPrices={displayPharmacies}
              maxPrice={unitMaxPrice}
              medicineName={selectedMedicine.name}
              searchQuery={getSmartSearchQuery(selectedMedicine)}
              isHospitalPackage={packageInfo.shouldCompareUnit}
              packageUnit={packageInfo.unit}
              originalMaxPrice={maxPrice}
            />
          </div>
        </div>
      </div>
    </>
  );
}
