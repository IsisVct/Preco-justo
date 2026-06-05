'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrustedPharmacy, trustedPharmacies } from '@/data/pharmacies';
import { PharmacyPrice } from '@/data/medicines';
import { getPharmacyProductUrl } from '@/lib/pharmacyUrl';

interface TrustedPharmaciesProps {
  pharmacyPrices?: PharmacyPrice[];
  maxPrice: number;
  medicineName: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${star <= Math.round(rating) ? 'text-amber-400' : 'text-zinc-700'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-zinc-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

const TYPE_LABELS: Record<TrustedPharmacy['type'], string> = {
  chain: 'Rede Nacional',
  online: 'Online',
  popular: 'Gov. Federal',
  cooperative: 'Cooperativa',
};

const TYPE_COLORS: Record<TrustedPharmacy['type'], string> = {
  chain: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  online: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  popular: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  cooperative: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
};

export function TrustedPharmaciesSection({ pharmacyPrices, maxPrice, medicineName }: TrustedPharmaciesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<TrustedPharmacy | null>(null);
  const [realPrices, setRealPrices] = useState<Record<string, { price?: number, url?: string, loading: boolean, error?: boolean, isLabDiscount?: boolean }>>({});

  // Map prices by pharmacy slug for quick lookup
  const priceMap = new Map<string, PharmacyPrice>();
  pharmacyPrices?.forEach((p) => priceMap.set(p.name, p));

  // Separate pharmacies: those with prices for this medicine vs others
  const withPrices = trustedPharmacies.filter((ph) => priceMap.has(ph.slug));
  const withoutPrices = trustedPharmacies.filter((ph) => !priceMap.has(ph.slug));
  const orderedPharmacies = [
    ...withPrices.sort((a, b) => (priceMap.get(a.slug)?.price ?? 999) - (priceMap.get(b.slug)?.price ?? 999)),
    ...withoutPrices,
  ];

  const cheapestPrice = withPrices.length > 0
    ? Math.min(...withPrices.map(p => {
        const rp = realPrices[p.slug]?.price;
        return rp !== undefined ? rp : (priceMap.get(p.slug)?.price ?? Infinity);
      }))
    : null;

  const fetchRealPrice = (pharmacy: TrustedPharmacy) => {
    if (realPrices[pharmacy.slug]?.loading || realPrices[pharmacy.slug]?.price) return;
    
    setRealPrices(prev => ({...prev, [pharmacy.slug]: { loading: true }}));
    const staticData = priceMap.get(pharmacy.slug);
    const url = getPharmacyProductUrl(pharmacy.name, medicineName, staticData?.url, pharmacy.website);
    
    fetch(`/api/scrape?url=${encodeURIComponent(url)}&pharmacy=${encodeURIComponent(pharmacy.name)}&medicine=${encodeURIComponent(medicineName)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRealPrices(prev => ({...prev, [pharmacy.slug]: { price: data.price, url: data.url, loading: false, isLabDiscount: data.isLabDiscount }}));
        } else {
          setRealPrices(prev => ({...prev, [pharmacy.slug]: { loading: false, error: true }}));
        }
      })
      .catch(() => {
        setRealPrices(prev => ({...prev, [pharmacy.slug]: { loading: false, error: true }}));
      });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle Button */}
      <button
        id="btn-ver-farmacias"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3.5 px-5 rounded-xl border border-zinc-700/60 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-zinc-600 transition-all group"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🏪</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
              Farmácias Confiáveis
            </p>
            <p className="text-xs text-zinc-500">
              {withPrices.length > 0
                ? `${withPrices.length} farmácias com preço para este medicamento`
                : 'Ver redes verificadas e confiáveis'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {cheapestPrice !== null && !isOpen && (
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 font-medium">
                A partir de R$ {cheapestPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="pharmacies-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pb-1">
              {orderedPharmacies.map((pharmacy, i) => {
                const priceData = priceMap.get(pharmacy.slug);
                const isFree = priceData?.price === 0;
                const isAbove = priceData && !isFree && priceData.price > maxPrice;
                const isCheapest = priceData && cheapestPrice !== null && priceData.price === cheapestPrice && !isFree;
                const isSelected = selectedPharmacy?.id === pharmacy.id;

                // Preço com desconto do cartão (para exibição)
                const priceWithDiscount = priceData?.discount
                  ? priceData.price * (1 - priceData.discount / 100)
                  : null;

                return (
                  <motion.div
                    key={pharmacy.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.3 }}
                    className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                      isSelected
                        ? 'border-zinc-600 bg-zinc-800/60'
                        : priceData
                          ? 'border-zinc-800/70 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/40'
                          : 'border-zinc-800/40 bg-zinc-900/20 opacity-60 hover:opacity-80 hover:border-zinc-800/70 transition-opacity'
                    }`}
                  >
                    {/* Card Header — clicável para expandir */}
                    <button
                      className="w-full text-left p-4 flex items-center gap-3"
                      onClick={() => {
                        setSelectedPharmacy(isSelected ? null : pharmacy);
                        if (!isSelected) {
                          fetchRealPrice(pharmacy);
                        }
                      }}
                    >
                      {/* Rank / número (só para farmácias com preço) */}
                      {priceData ? (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{
                            backgroundColor: isCheapest ? '#10b98130' : '#ffffff0a',
                            color: isCheapest ? '#34d399' : '#71717a',
                            border: `1px solid ${isCheapest ? '#10b98140' : '#3f3f4640'}`,
                          }}
                        >
                          {i + 1}º
                        </div>
                      ) : (
                        <div className="w-6 shrink-0" />
                      )}

                      {/* Logo / Emoji */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${pharmacy.color}18`, border: `1px solid ${pharmacy.color}30` }}
                      >
                        {pharmacy.logo}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{pharmacy.name}</span>
                          {isCheapest && (
                            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full px-2 py-0.5">
                              🏆 Mais Barata
                            </span>
                          )}
                          {pharmacy.badge && !isCheapest && (
                            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-full px-2 py-0.5">
                              ⭐ {pharmacy.badge}
                            </span>
                          )}
                          <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${TYPE_COLORS[pharmacy.type]}`}>
                            {TYPE_LABELS[pharmacy.type]}
                          </span>
                          {realPrices[pharmacy.slug]?.isLabDiscount && (
                            <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25 rounded-full px-2 py-0.5" title="Preço obtido via programa de laboratório (PBM) - Exige CPF">
                              🧪 Lab/PBM
                            </span>
                          )}
                        </div>
                        <StarRating rating={pharmacy.rating} />
                      </div>

                      {/* Preço destacado */}
                      <div className="shrink-0 text-right min-w-[90px]">
                        {realPrices[pharmacy.slug]?.loading ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="w-16 h-5 bg-zinc-800 animate-pulse rounded"></span>
                            <span className="text-[10px] text-zinc-500">Buscando preço real...</span>
                          </div>
                        ) : (realPrices[pharmacy.slug]?.price || priceData) ? (
                          <div className="flex flex-col items-end gap-0.5">
                            {/* Preço principal */}
                            <div
                              className={`text-lg font-extrabold tabular-nums leading-none ${
                                isFree
                                  ? 'text-emerald-400'
                                  : isAbove
                                    ? 'text-red-400'
                                    : 'text-emerald-300'
                              }`}
                            >
                              {isFree ? 'GRÁTIS' : `R$ ${(realPrices[pharmacy.slug]?.price || priceData!.price).toFixed(2).replace('.', ',')}`}
                            </div>

                            {/* Preço com desconto do cartão */}
                            {priceWithDiscount && (
                              <div className="text-[11px] text-blue-300 font-medium">
                                R$ {priceWithDiscount.toFixed(2).replace('.', ',')} c/ cartão
                              </div>
                            )}

                            {/* Atualizado em tempo real badge */}
                            {realPrices[pharmacy.slug]?.price && (
                               <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                 AO VIVO
                               </span>
                            )}

                            {/* Badge acima/abaixo do teto */}
                            {!isFree && !realPrices[pharmacy.slug]?.price && (
                              <span
                                className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 inline-block ${
                                  isAbove
                                    ? 'text-red-400 bg-red-500/10'
                                    : 'text-emerald-400 bg-emerald-500/10'
                                }`}
                              >
                                {isAbove ? '▲ acima' : '▼ abaixo'} do teto
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-zinc-500 italic">Sem preço</span>
                            <span className="text-[10px] text-zinc-600">para este med.</span>
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <motion.svg
                        animate={{ rotate: isSelected ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-3.5 h-3.5 text-zinc-600 shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </motion.svg>
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 border-t border-zinc-800/60">
                            {/* Resumo de preço no detalhe */}
                            {(realPrices[pharmacy.slug]?.price || priceData) && !isFree && (
                              <div className="mt-3 mb-3 p-3 rounded-lg bg-zinc-800/50 flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Preço nesta farmácia {realPrices[pharmacy.slug]?.price && '(Ao vivo)'}</p>
                                  <p className={`text-xl font-extrabold tabular-nums ${isAbove ? 'text-red-400' : 'text-emerald-300'}`}>
                                    R$ {(realPrices[pharmacy.slug]?.price || priceData!.price).toFixed(2).replace('.', ',')}
                                  </p>
                                  {realPrices[pharmacy.slug]?.isLabDiscount && (
                                    <p className="text-xs text-purple-300 mt-0.5">
                                      Exige CPF cadastrado no programa de laboratório (PBM)
                                    </p>
                                  )}
                                  {priceWithDiscount && (
                                    <p className="text-xs text-blue-300 mt-0.5">
                                      R$ {priceWithDiscount.toFixed(2).replace('.', ',')} com {pharmacy.loyaltyCardName ?? 'cartão de desconto'}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Teto ANVISA</p>
                                  <p className="text-lg font-bold text-orange-300 tabular-nums">
                                    R$ {maxPrice.toFixed(2).replace('.', ',')}
                                  </p>
                                  <p className={`text-[10px] font-semibold mt-0.5 ${isAbove ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {isAbove
                                      ? `▲ R$ ${((realPrices[pharmacy.slug]?.price || priceData!.price) - maxPrice).toFixed(2).replace('.', ',')} acima`
                                      : `▼ R$ ${(maxPrice - (realPrices[pharmacy.slug]?.price || priceData!.price)).toFixed(2).replace('.', ',')} abaixo`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Highlights */}
                            <ul className="flex flex-col gap-1.5 mt-2 mb-4">
                              {pharmacy.highlights.map((h) => (
                                <li key={h} className="flex items-start gap-2 text-xs text-zinc-400">
                                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {h}
                                </li>
                              ))}
                              {pharmacy.hasLoyaltyCard && (
                                <li className="flex items-start gap-2 text-xs text-blue-400">
                                  <svg className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  Programa de fidelidade: {pharmacy.loyaltyCardName}
                                </li>
                              )}
                            </ul>

                            {/* CTA Button */}
                            <a
                              href={
                                realPrices[pharmacy.slug]?.url ||
                                getPharmacyProductUrl(
                                  pharmacy.name,
                                  medicineName,
                                  priceData?.url,
                                  pharmacy.website,
                                )
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              id={`btn-ver-loja-${pharmacy.id}`}
                              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 relative overflow-hidden group"
                              style={{ backgroundColor: pharmacy.color }}
                            >
                              {/* Efeito de brilho caso tenha achado o link exato */}
                              {realPrices[pharmacy.slug]?.url && (
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                              )}
                              
                              {realPrices[pharmacy.slug]?.url ? 'Comprar Agora (Link Exato)' : (priceData ? 'Ver Preço na Loja' : 'Visitar Site Oficial')}
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              <p className="text-[11px] text-zinc-600 text-center leading-relaxed">
                Farmácias selecionadas com base em critérios de confiabilidade, presença nacional e conformidade com a ANVISA.
                Preços aproximados — verifique o valor atual no site oficial.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
