'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Award, AlertTriangle, Info, Loader2, ExternalLink, Trophy, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parsePackageInfo } from "@/lib/medicineMatcher";
import { checkFarmaciaPopular } from "@/lib/farmaciaPopular";
import { getPharmacyProductUrl } from "@/lib/pharmacyUrl";
import { SusAvailabilityBadge } from "@/components/SusAvailabilityBadge";
import { Medicine } from "@/data/medicines";

const BRAZILIAN_STATES = [
  { code: "AC", name: "Acre", icms: 19 },
  { code: "AL", name: "Alagoas", icms: 19 },
  { code: "AM", name: "Amazonas", icms: 20 },
  { code: "AP", name: "Amapá", icms: 18 },
  { code: "BA", name: "Bahia", icms: 19 },
  { code: "CE", name: "Ceará", icms: 20 },
  { code: "DF", name: "Distrito Federal", icms: 18 },
  { code: "ES", name: "Espírito Santo", icms: 17 },
  { code: "GO", name: "Goiás", icms: 17 },
  { code: "MA", name: "Maranhão", icms: 22 },
  { code: "MG", name: "Minas Gerais", icms: 18 },
  { code: "MS", name: "Mato Grosso do Sul", icms: 19 },
  { code: "MT", name: "Mato Grosso", icms: 17 },
  { code: "PA", name: "Pará", icms: 19 },
  { code: "PB", name: "Paraíba", icms: 18 },
  { code: "PE", name: "Pernambuco", icms: 20.5 },
  { code: "PI", name: "Piauí", icms: 21 },
  { code: "PR", name: "Paraná", icms: 19 },
  { code: "RJ", name: "Rio de Janeiro", icms: 20 },
  { code: "RN", name: "Rio Grande do Norte", icms: 18 },
  { code: "RO", name: "Rondônia", icms: 19.5 },
  { code: "RR", name: "Roraima", icms: 20 },
  { code: "RS", name: "Rio Grande do Sul", icms: 18 },
  { code: "SC", name: "Santa Catarina", icms: 17 },
  { code: "SE", name: "Sergipe", icms: 19 },
  { code: "SP", name: "São Paulo", icms: 18 },
  { code: "TO", name: "Tocantins", icms: 20 },
];

const PHARMACIES = [
  { name: "Drogasil", url: "drogasil.com.br" },
  { name: "Pague Menos", url: "paguemenos.com.br" },
  { name: "Ultrafarma", url: "ultrafarma.com.br" },
];

interface PriceData {
  price: number | null;
  loading: boolean;
  error: string | null;
  url?: string;
  isLabDiscount?: boolean;
}

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

  // Medicamentos compostos: nome contém "+" (ex: "DIPIRONA SODICA+CAFEINA ANIDRA+CITRATO DE ORFENADRINA")
  // Usar apenas a primeira substância + dados da descrição para não poluir a query das farmácias
  const isCompound = medicine.name.includes('+');
  const baseName = isCompound ? medicine.name.split('+')[0].trim() : medicine.name;

  const parts = [baseName];
  if (medicine.description) {
     const desc = medicine.description;
     if (isCompound) {
       // Para compostos: pega apenas a PRIMEIRA dosagem e forma da descrição
       const words = desc.split(/\s+/);
       const importantWords = words.filter(w => {
          const lower = w.toLowerCase();
          if (/\d/.test(lower)) return true;
          if (['mg', 'ml', 'g', 'mcg', 'ui', 'mg/ml'].includes(lower)) return true;
          if (['comprimidos', 'cápsulas', 'gotas', 'xarope', 'solução', 'drágeas'].includes(lower)) return true;
          return false;
       });
       const firstDosage = importantWords.find(w => /\d/.test(w));
       const firstForm = importantWords.find(w =>
         ['comprimidos', 'cápsulas', 'gotas', 'xarope', 'solução', 'drágeas'].includes(w.toLowerCase())
       );
       if (firstDosage) parts.push(firstDosage);
       if (firstForm) parts.push(firstForm);
     } else {
       // Para não-compostos: pega dados numéricos e formas da primeira parte da descrição (antes do "+")
       const mainDesc = desc.split('+')[0];
       const mainWords = mainDesc.split(/\s+/).filter(w => {
         const lower = w.toLowerCase();
         if (/\d/.test(lower)) return true;
         if (['mg', 'ml', 'g', 'mcg', 'ui', 'mg/ml'].includes(lower)) return true;
         if (['comprimidos', 'cápsulas', 'gotas', 'xarope', 'solução', 'drágeas'].includes(lower)) return true;
         return false;
       });
       parts.push(...mainWords);
     }
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

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedState, setSelectedState] = useState(BRAZILIAN_STATES.find(s => s.code === "SP") || BRAZILIAN_STATES[0]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const suppressSearch = useRef(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca debounced na API
  useEffect(() => {
    if (suppressSearch.current) {
      suppressSearch.current = false;
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/medicines?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Erro ao buscar medicamentos:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const calculateMaxPrice = (medicine: Medicine, state: typeof BRAZILIAN_STATES[0]) => {
    const basePrice18 = medicine.maxPrice;
    const priceWithoutTax = basePrice18 / 1.18;
    const isGenericInSP = medicine.isGeneric && state.code === "SP";
    const icmsRate = isGenericInSP ? 12 : state.icms;
    return priceWithoutTax * (1 + icmsRate / 100);
  };

  const handleSelectMedicine = (medicine: Medicine) => {
    suppressSearch.current = true;
    setSelectedMedicine(medicine);
    setShowDropdown(false);
    setSearchQuery(medicine.name);
    setPrices({});

    // Detecta antecipadamente se é produto hospitalar (para não disparar buscas desnecessárias)
    const pkg = parsePackageInfo(medicine.description || '');
    if (pkg.isHospitalOrWholesale) {
      // Produto hospitalar: não há busca em farmácias de varejo
      return;
    }

    PHARMACIES.forEach((pharmacy) => {
      setPrices((prev) => ({
        ...prev,
        [pharmacy.name]: { price: null, loading: true, error: null },
      }));

      const queryToUse = getSmartSearchQuery(medicine);
      const searchUrl = getPharmacyProductUrl(pharmacy.name, queryToUse, undefined);

      // Para medicamentos de marca (não genéricos), envia o nome da marca para o scraper
      // validar que o produto encontrado é o mesmo (evita retornar outra marca com a mesma substância)
      const brandParam = !medicine.isGeneric ? `&brand=${encodeURIComponent(medicine.name)}` : '';

      const doFetch = (attempt: number) =>
        fetch(`/api/scrape?url=${encodeURIComponent(searchUrl)}&pharmacy=${encodeURIComponent(pharmacy.name)}&medicine=${encodeURIComponent(queryToUse)}${brandParam}&t=${Date.now()}`)
          .then(async (res) => {
            const isJson = res.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await res.json() : null;
            if (res.ok && data && data.success && data.price !== undefined && data.price !== null) {
              setPrices((prev) => ({
                ...prev,
                [pharmacy.name]: {
                  price: data.price,
                  loading: false,
                  error: null,
                  url: data.url || searchUrl,
                  isLabDiscount: data.isLabDiscount,
                },
              }));
            } else if (attempt === 0 && pharmacy.name === 'Drogasil') {
              // Retry automático para Drogasil após 2s
              setTimeout(() => doFetch(1), 2000);
            } else {
              let errMessage = "Não encontrado";
              if (data?.error?.toLowerCase().includes("stock")) {
                errMessage = "Sem estoque desta versão";
              } else if (data?.error?.toLowerCase().includes("exact product") || data?.error?.toLowerCase().includes("not found") || res.status === 404) {
                errMessage = "Dose/Qtd não encontrada";
              }
              setPrices((prev) => ({
                ...prev,
                [pharmacy.name]: {
                  price: null,
                  loading: false,
                  error: errMessage,
                },
              }));
            }
          })
          .catch(() => {
            if (attempt === 0 && pharmacy.name === 'Drogasil') {
              setTimeout(() => doFetch(1), 2000);
            } else {
              setPrices((prev) => ({
                ...prev,
                [pharmacy.name]: {
                  price: null,
                  loading: false,
                  error: "Erro na busca",
                },
              }));
            }
          });

      doFetch(0);
    });

  };

  const packageInfo = selectedMedicine ? parsePackageInfo(selectedMedicine.description || '') : null;
  const maxPrice = selectedMedicine ? calculateMaxPrice(selectedMedicine, selectedState) : 0;
  const unitMaxPrice = selectedMedicine && packageInfo
    ? (packageInfo.shouldCompareUnit ? maxPrice / packageInfo.quantity : maxPrice)
    : maxPrice;

  // Farmácia Popular
  const fpData = selectedMedicine ? checkFarmaciaPopular(selectedMedicine.activeIngredient) : null;
  const finalSusAvailability = selectedMedicine?.susAvailability || (fpData ? {
    sus: true,
    farmaciapopular: true,
    note: fpData.note
  } : undefined);

  // Ordenar preços
  const sortedPrices = [
    ...PHARMACIES.map((pharmacy) => ({
      name: pharmacy.name,
      website: pharmacy.url,
      ...prices[pharmacy.name],
    })),
    ...(fpData && selectedMedicine ? [{
      name: "Farmácia Popular",
      website: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/f/farmacia-popular",
      price: fpData.type === 'free' ? 0 : unitMaxPrice * 0.1,
      loading: false,
      error: null,
      url: "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/f/farmacia-popular",
    }] : [])
  ].sort((a, b) => {
    const isAUnavailable = a.loading || a.price === null || a.price === undefined;
    const isBUnavailable = b.loading || b.price === null || b.price === undefined;
    if (isAUnavailable && !isBUnavailable) return 1;
    if (!isAUnavailable && isBUnavailable) return -1;
    if (isAUnavailable && isBUnavailable) return 0;
    return (a.price || 0) - (b.price || 0);
  });

  const bestPrice = sortedPrices.find((p) => p.price !== null && p.price !== undefined)?.price;

  // Produto hospitalar/atacado: não disponível em farmácias de varejo
  const isHospitalProduct = !!(packageInfo?.isHospitalOrWholesale);

  return (
    <div className="min-h-screen bg-background bg-gradient-to-br from-background via-secondary/30 to-muted/50 flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
            <img src="/logo-icon.png" alt="Preço Justo Icon" className="w-12 h-12 object-contain shrink-0" />
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Work Sans, sans-serif" }}>
              <span className="text-[#263095] dark:text-[#3f4bc3]">Preço</span>
              <span className="text-[#10b981] dark:text-[#34d399]"> Justo</span>
            </h1>
          </Link>
          <div className="flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link href="/sobre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sobre
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="relative">
          <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Info className="w-4 h-4" />
                Dados oficiais da ANVISA
              </div>
              <h2
                className="text-5xl font-bold leading-tight mb-4 text-foreground"
                style={{ fontFamily: "Work Sans, sans-serif" }}
              >
                Compare preços e <span className="text-primary">combata abusos</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Consulte o Preço Máximo ao Consumidor regulamentado e compare com farmácias em tempo real.
                Transparência para todos.
              </p>

              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Digite o nome do medicamento ou princípio ativo..."
                    value={searchQuery}
                    onChange={(e) => {
                      suppressSearch.current = false;
                      setSearchQuery(e.target.value);
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowDropdown(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        handleSelectMedicine(searchResults[0]);
                      }
                    }}
                    className="w-full pl-14 pr-4 py-4 text-lg bg-card border-2 border-border rounded-xl focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-spin" />
                  )}
                </div>

                <AnimatePresence>
                  {showDropdown && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto"
                    >
                      {searchResults.map((medicine) => (
                        <button
                          key={medicine.id}
                          onClick={() => handleSelectMedicine(medicine)}
                          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 block"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-medium text-foreground">{medicine.name}</div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                {medicine.laboratory}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {medicine.description}
                              </div>
                            </div>
                            {medicine.isGeneric && (
                              <span className="px-2 py-1 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider whitespace-nowrap">
                                Genérico
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {showDropdown && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-2xl p-6 text-center z-50 text-muted-foreground"
                    >
                      Nenhum medicamento encontrado para &quot;{searchQuery}&quot;.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className={`bg-card border border-border rounded-2xl p-8 shadow-lg ${selectedMedicine ? 'hidden lg:block' : ''}`}>
              <div className="text-center">
                <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                <div className="text-6xl font-bold text-primary mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  21K+
                </div>
                <div className="text-muted-foreground">medicamentos regulados na base CMED</div>
              </div>
              <div className="mt-8 pt-8 border-t border-border grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    27
                  </div>
                  <div className="text-sm text-muted-foreground">Estados cobertos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    3
                  </div>
                  <div className="text-sm text-muted-foreground">Farmácias pesquisadas</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {selectedMedicine && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-7xl mx-auto px-6 py-16"
            >
              <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-3xl font-bold text-foreground" style={{ fontFamily: "Work Sans, sans-serif" }}>
                        {selectedMedicine.name}
                      </h3>
                      {selectedMedicine.isGeneric && (
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
                          Genérico
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-1">
                      <span className="font-semibold text-foreground">Princípio ativo:</span> {selectedMedicine.activeIngredient}
                    </p>
                    <p className="text-muted-foreground mb-1">
                      <span className="font-semibold text-foreground">Laboratório:</span> {selectedMedicine.laboratory}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedMedicine.description}</p>
                  </div>

                  <div className="relative w-full md:w-auto">
                    <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">
                      Seu estado
                    </label>
                    <select
                      value={selectedState.code}
                      onChange={(e) => {
                        const state = BRAZILIAN_STATES.find((s) => s.code === e.target.value);
                        if (state) setSelectedState(state);
                      }}
                      className="pl-3 pr-10 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-semibold min-w-[220px] text-foreground cursor-pointer hover:border-zinc-700 transition-colors"
                    >
                      {BRAZILIAN_STATES.map((state) => {
                        const isGenericInSP = selectedMedicine.isGeneric && state.code === "SP";
                        const displayIcms = isGenericInSP ? 12 : state.icms;
                        return (
                          <option key={state.code} value={state.code}>
                            {state.name} - ICMS {displayIcms}%
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Seção Teto Legal & Alertas */}
                <div className="grid md:grid-cols-[1.5fr_1fr] gap-8 mb-8 items-start">
                  <div>
                    {/* Glow box da ANVISA */}
                    <div className="bg-accent/10 border-l-4 border-accent rounded-lg p-6 mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-accent-foreground" />
                        <h4 className="font-bold text-accent-foreground">Preço Máximo ao Consumidor - ANVISA</h4>
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-5xl font-bold text-accent-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          R$ {unitMaxPrice.toFixed(2).replace('.', ',')}
                        </span>
                        {packageInfo?.shouldCompareUnit && (
                          <span className="text-sm font-bold text-accent-foreground/80">
                            / {packageInfo.unit}
                          </span>
                        )}
                        <span className="text-sm text-accent-foreground/80">
                          para {selectedState.name}
                        </span>
                      </div>
                      <p className="text-sm text-accent-foreground/70 mt-2">
                        Este é o valor máximo regulado pela ANVISA. Farmácias não podem vender acima deste preço.
                      </p>
                      {packageInfo?.shouldCompareUnit && (
                        <p className="text-xs text-accent-foreground/50 mt-1">
                          Caixa fechada: R$ {maxPrice.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>

                    {/* Alerta de embalagem hospitalar */}
                    {packageInfo && packageInfo.shouldCompareUnit && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-200 text-sm mb-4">
                        <span className="text-lg shrink-0">⚠️</span>
                        <div>
                          <p className="font-semibold text-amber-300">Embalagem Hospitalar/Atacado Detectada</p>
                          <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                            O teto ANVISA original de <strong>R$ {maxPrice.toFixed(2).replace('.', ',')}</strong> corresponde à caixa fechada contendo <strong>{packageInfo.quantity} {packageInfo.unit}s</strong>. Como as farmácias vendem unidades individuais, calculamos o teto proporcional unitário de <strong>R$ {unitMaxPrice.toFixed(2).replace('.', ',')}</strong> para a comparação abaixo.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Alerta de quantidade grande / multipack */}
                    {packageInfo && packageInfo.isHospitalOrWholesale && !packageInfo.shouldCompareUnit && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-200 text-sm mb-4">
                        <span className="text-lg shrink-0">⚠️</span>
                        <div>
                          <p className="font-semibold text-amber-300">Embalagem Múltipla ou Atacado ({packageInfo.quantity} {packageInfo.unit}s)</p>
                          <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                            O teto legal de <strong>R$ {maxPrice.toFixed(2).replace('.', ',')}</strong> corresponde a uma embalagem múltipla ou lote com <strong>{packageInfo.quantity} unidades</strong>. Como as farmácias de varejo vendem caixas individuais menores (ex: 30 unidades), a comparação direta de porcentagem abaixo fica distorcida em relação ao valor total da caixa grande.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Badges SUS e Programas */}
                  {finalSusAvailability && (
                    <div className="w-full">
                      <SusAvailabilityBadge availability={finalSusAvailability} />
                    </div>
                  )}
                </div>

                {/* Tabela de preços (apenas varejo) */}
                {isHospitalProduct ? (
                  /* Banner especial para produtos hospitalares */
                  <div className="border border-amber-500/30 rounded-xl bg-amber-500/5 p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <span className="text-2xl">🏥</span>
                      </div>
                      <h5 className="text-lg font-bold text-amber-300">Produto de Uso Hospitalar</h5>
                      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                        Este medicamento é destinado a <strong className="text-foreground">hospitais, clínicas e distribuidores autorizados</strong>.
                        Não é comercializado em farmácias de varejo convencionais.
                      </p>
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <p className="text-xs text-muted-foreground">
                          Teto ANVISA de referência:
                        </p>
                        <span className="text-2xl font-bold text-amber-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          R$ {unitMaxPrice.toFixed(2).replace('.', ',')}
                          {packageInfo?.shouldCompareUnit && <span className="text-sm font-normal text-amber-400/70 ml-1">/ {packageInfo.unit}</span>}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Caixa fechada com {packageInfo?.quantity} {packageInfo?.unit}s: R$ {maxPrice.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-card/30">
                  <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Farmácia
                        </th>
                        <th className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Preço Atual
                        </th>
                        <th className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          vs Teto ANVISA
                        </th>
                        <th className="px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPrices.map((pharmacy) => {
                        const isBest = pharmacy.price === bestPrice && bestPrice !== null && bestPrice !== undefined;
                        const isFree = pharmacy.price === 0;
                        const diff = (pharmacy.price || 0) - unitMaxPrice;
                        const diffPercent = pharmacy.price ? ((diff / unitMaxPrice) * 100).toFixed(0) : null;
                        const isAbove = diff > 0;

                        return (
                          <tr
                            key={pharmacy.name}
                            className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                              isBest ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
                            }`}
                          >
                            <td className="px-6 py-4 font-medium">
                              <div className="flex items-center gap-2.5">
                                {pharmacy.url ? (
                                  <a
                                    href={pharmacy.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline flex items-center gap-1 group transition-colors"
                                  >
                                    {pharmacy.name}
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                  </a>
                                ) : (
                                  <span className="text-sm font-semibold text-foreground">{pharmacy.name}</span>
                                )}
                                {pharmacy.isLabDiscount && (
                                  <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-1.5 py-0.5 shrink-0" title="Preço de Programa de Laboratório (PBM)">
                                    🧪 Lab/PBM
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {pharmacy.loading && (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                  <span className="text-sm text-muted-foreground">Buscando...</span>
                                </div>
                              )}
                              {!pharmacy.loading && pharmacy.price !== null && pharmacy.price !== undefined && (
                                <div className="flex flex-col items-start">
                                  <span
                                    className={`text-xl font-bold ${
                                      (isFree || isBest) ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                    }`}
                                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                                  >
                                    {isFree ? "GRATUITO" : `R$ ${pharmacy.price.toFixed(2).replace('.', ',')}`}
                                  </span>
                                  {pharmacy.name !== 'Farmácia Popular' && (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                      <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                                      AO VIVO
                                    </span>
                                  )}
                                </div>
                              )}
                              {!pharmacy.loading && (pharmacy.price === null || pharmacy.price === undefined) && (
                                <span className="text-sm text-muted-foreground font-semibold bg-muted border border-border px-2 py-0.5 rounded select-none inline-block">
                                  {pharmacy.error || "Não encontrado"}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {!pharmacy.loading && pharmacy.price !== null && pharmacy.price !== undefined && (
                                <span
                                  className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                                    isFree
                                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10"
                                      : isAbove
                                      ? "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10"
                                      : "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10"
                                  }`}
                                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                                >
                                  {isFree ? "100% economia" : `${isAbove ? "+" : ""}${diffPercent}%`}
                                </span>
                              )}
                              {(pharmacy.loading || pharmacy.price === null || pharmacy.price === undefined) && (
                                <span className="text-sm text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isBest && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-accent/20 text-accent-foreground uppercase tracking-wide">
                                  <Trophy className="w-3.5 h-3.5" />
                                  Melhor Preço
                                </span>
                              )}
                              {!pharmacy.loading && (pharmacy.price === null || pharmacy.price === undefined) && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Indisponível
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Linha do Teto ANVISA */}
                      <tr className="bg-muted/30 border-t border-dashed border-zinc-300 dark:border-zinc-700">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30 rounded-full px-2 py-0.5 uppercase tracking-wider">
                              ⚖️ Teto Legal
                            </span>
                            <span className="text-sm text-muted-foreground font-semibold">
                              ANVISA / CMED {packageInfo?.shouldCompareUnit ? `(por ${packageInfo.unit})` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                            R$ {unitMaxPrice.toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground font-medium">limite oficial</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground font-semibold bg-muted border border-border px-2 py-0.5 rounded uppercase tracking-wider select-none inline-block">
                            Referência
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                )}

                <p className="text-[11px] text-muted-foreground mt-6 leading-relaxed">
                  * <strong>Aviso:</strong> Os valores extraídos representam o <strong>preço base</strong> do site oficial das farmácias. Descontos adicionais dinâmicos (ex: Programas de Laboratório - PBM, convênios médicos, ou CPF do cliente) não são aplicados nesta simulação. Clique no link da farmácia para verificar possíveis descontos extras no site oficial.
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {!selectedMedicine && (
          <section className="max-w-7xl mx-auto px-6 py-16 text-center">
            <p className="text-muted-foreground text-lg">
              Digite o nome de um medicamento acima para começar a comparar preços
            </p>
          </section>
        )}
      </main>

      <footer className="border-t border-border bg-card/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>
            Dados baseados na tabela CMED (Câmara de Regulação do Mercado de Medicamentos) da ANVISA.
          </p>
          <p className="mt-2">Preço Justo - Transparência para todos os brasileiros.</p>
        </div>
      </footer>
    </div>
  );
}
