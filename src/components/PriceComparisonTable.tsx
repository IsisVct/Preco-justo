'use client';
import { useState, useEffect } from 'react';
import { PharmacyPrice } from '@/data/medicines';
import { motion } from 'framer-motion';
import { getPharmacyProductUrl } from '@/lib/pharmacyUrl';

interface PriceComparisonTableProps {
  pharmacyPrices: PharmacyPrice[];
  maxPrice: number; // Teto ANVISA calculado com ICMS do estado
  medicineName: string;
  searchQuery?: string;
  isHospitalPackage?: boolean;
  packageUnit?: string;
  originalMaxPrice?: number;
}

export function PriceComparisonTable({
  pharmacyPrices,
  maxPrice,
  medicineName,
  searchQuery,
  isHospitalPackage = false,
  packageUnit = 'unidade',
  originalMaxPrice
}: PriceComparisonTableProps) {
  const [realPrices, setRealPrices] = useState<Record<string, { 
    price?: number; 
    url?: string; 
    loading: boolean; 
    found?: boolean; 
    isLabDiscount?: boolean;
    status?: 'not_found' | 'out_of_stock' | 'error';
  }>>({});
  
  const queryToUse = searchQuery || medicineName;
 
  useEffect(() => {
    pharmacyPrices.forEach(p => {
      if (p.name === 'Farmácia Popular') {
        if (!realPrices[p.name]) {
          setRealPrices(prev => ({...prev, [p.name]: { price: p.price, loading: false, found: true }}));
        }
        return;
      }
 
      if (!realPrices[p.name]) {
        setRealPrices(prev => ({...prev, [p.name]: { loading: true }}));
        const searchUrl = getPharmacyProductUrl(p.name, queryToUse, p.url);
        
        fetch(`/api/scrape?url=${encodeURIComponent(searchUrl)}&pharmacy=${encodeURIComponent(p.name)}&medicine=${encodeURIComponent(queryToUse)}&fallbackPrice=${p.price}&t=${Date.now()}`, { cache: 'no-store' })
          .then(async res => {
            const isJson = res.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await res.json() : null;
            return { ok: res.ok, status: res.status, data };
          })
          .then(({ ok, status, data }) => {
            if (ok && data && data.success && data.price !== undefined && data.price !== null) {
              setRealPrices(prev => ({...prev, [p.name]: { price: data.price, url: data.url, loading: false, found: true, isLabDiscount: data.isLabDiscount }}));
            } else {
              // Define o status específico do erro
              let errStatus: 'not_found' | 'out_of_stock' | 'error' = 'out_of_stock';
              if (status === 404 || data?.error?.toLowerCase().includes('exact product') || data?.error?.toLowerCase().includes('not found')) {
                errStatus = 'not_found';
              }
              setRealPrices(prev => ({...prev, [p.name]: { loading: false, found: false, status: errStatus }}));
            }
          })
          .catch(() => {
            setRealPrices(prev => ({...prev, [p.name]: { loading: false, found: false, status: 'error' }}));
          });
      }
    });
  }, [pharmacyPrices, medicineName]);

  // Ordenar do mais barato para o mais caro, empurrando os indisponíveis para o fim
  const sorted = [...pharmacyPrices].sort((a, b) => {
    const dataA = realPrices[a.name];
    const dataB = realPrices[b.name];
    
    const isUnavailA = dataA && !dataA.loading && !dataA.found;
    const isUnavailB = dataB && !dataB.loading && !dataB.found;

    if (isUnavailA && !isUnavailB) return 1;
    if (!isUnavailA && isUnavailB) return -1;

    const priceA = dataA?.price ?? a.price;
    const priceB = dataB?.price ?? b.price;
    return priceA - priceB;
  });
  

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
          🛒 Onde Comprar Mais Barato
        </h4>
        <span className="text-xs text-zinc-500">Preços aproximados • Atualizado mensalmente</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/60">
              <th className="text-left text-[11px] text-zinc-500 uppercase tracking-wider px-4 py-2.5 font-medium">
                Farmácia
              </th>
              <th className="text-right text-[11px] text-zinc-500 uppercase tracking-wider px-4 py-2.5 font-medium">
                Preço
              </th>
              <th className="text-right text-[11px] text-zinc-500 uppercase tracking-wider px-4 py-2.5 font-medium">
                vs. Teto ANVISA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sorted.map((p, i) => {
              const liveData = realPrices[p.name];
              const displayPrice = liveData?.price ?? p.price;
              
              const isUnavailable = liveData && !liveData.loading && !liveData.found;
              const isCheapest = i === 0 && !isUnavailable;
              const isFree = displayPrice === 0 && !isUnavailable;
              const diff = displayPrice - maxPrice;
              const diffPercent = ((diff / maxPrice) * 100).toFixed(0);
              const isAbove = diff > 0;

              return (
                <motion.tr
                  key={p.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`transition-colors hover:bg-zinc-800/40 ${
                    isCheapest ? 'bg-emerald-950/30' : 'bg-transparent'
                  }`}
                >
                  {/* Nome da farmácia */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {isCheapest && (
                        <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5 shrink-0">
                          🏆 Melhor
                        </span>
                      )}
                      {(() => {
                        const href = liveData?.url || getPharmacyProductUrl(p.name, queryToUse, p.url);
                        return href !== '#' ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-zinc-200 hover:text-white transition-colors font-medium hover:underline underline-offset-2 flex items-center gap-1 group"
                          >
                            {p.name}
                            <svg
                              className="inline w-3 h-3 text-zinc-500 group-hover:text-emerald-400 transition-colors"
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-sm text-zinc-200 font-medium">{p.name}</span>
                        );
                      })()}
                      {p.discount && (
                        <span className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-1.5 py-0.5 shrink-0">
                          -{p.discount}% cartão
                        </span>
                      )}
                      {liveData?.isLabDiscount && (
                        <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-1.5 py-0.5 shrink-0" title="Preço de Programa de Laboratório (PBM) - Exige CPF e cadastro">
                          🧪 Lab/PBM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Preço */}
                  <td className="px-4 py-3 text-right">
                    {liveData?.loading ? (
                       <span className="text-xs text-zinc-500 animate-pulse">Buscando...</span>
                    ) : isUnavailable ? (
                       <span className="text-xs font-semibold text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800/80 inline-block text-center select-none" title={liveData?.status === 'not_found' ? 'Essa dosagem ou quantidade de embalagem não foi encontrada no site da farmácia.' : 'Esse produto está cadastrado no site da farmácia, mas está temporariamente sem estoque.'}>
                         {liveData?.status === 'not_found' ? 'Dose/Qtd não encontrada' : 'Sem estoque desta versão'}
                       </span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold tabular-nums ${
                          isFree ? 'text-emerald-400' : isCheapest ? 'text-emerald-300' : 'text-zinc-200'
                        }`}>
                          {isFree ? 'GRATUITO' : `R$ ${displayPrice.toFixed(2).replace('.', ',')}`}
                        </span>
                        {liveData?.price !== undefined && p.name !== 'Farmácia Popular' && (
                           <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                             <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                             AO VIVO
                           </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Vs. Teto */}
                  <td className="px-4 py-3 text-right">
                    {isUnavailable ? (
                      <span className="text-xs text-zinc-600">-</span>
                    ) : isFree ? (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-1">
                        100% economia
                      </span>
                    ) : (
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 ${
                        isAbove
                          ? 'text-red-400 bg-red-500/10'
                          : 'text-emerald-400 bg-emerald-500/10'
                      }`}>
                        {isAbove ? '+' : ''}{diffPercent}%
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}

            {/* Linha do Teto ANVISA */}
            <tr className="bg-zinc-900/80 border-t border-dashed border-zinc-700">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5">
                    ⚖️ Teto {isHospitalPackage ? 'Unitário' : ''}
                  </span>
                  <span className="text-sm text-zinc-400 font-medium">
                    ANVISA / CMED {isHospitalPackage ? `(por ${packageUnit})` : ''}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-bold text-orange-300 tabular-nums">
                  R$ {maxPrice.toFixed(2).replace('.', ',')}
                  {isHospitalPackage && (
                    <span className="text-[10px] font-semibold text-orange-400 ml-1">/ {packageUnit}</span>
                  )}
                </span>
                {isHospitalPackage && originalMaxPrice && (
                  <span className="block text-[10px] text-zinc-500 font-normal mt-0.5">
                    Caixa fechada: R$ {originalMaxPrice.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-xs text-zinc-500">limite legal</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-zinc-600 leading-relaxed">
        * <strong>Aviso:</strong> Os valores extraídos representam o <strong>preço base</strong> do site. Descontos dinâmicos gerados no navegador (ex: Programas de Laboratório - PBM, convênios ou CPF) não são refletidos aqui. Clique na farmácia para verificar se o seu perfil possui descontos adicionais diretamente no site oficial.
      </p>
    </motion.div>
  );
}
