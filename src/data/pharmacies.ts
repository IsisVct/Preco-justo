export interface TrustedPharmacy {
  id: string;
  name: string;
  slug: string; // matches PharmacyPrice.name for lookup
  logo: string; // emoji fallback
  tagline: string;
  type: 'chain' | 'online' | 'popular' | 'cooperative';
  rating: number; // 0-5
  highlights: string[];
  website: string;
  hasLoyaltyCard: boolean;
  loyaltyCardName?: string;
  color: string; // brand accent color (tailwind-compatible hex)
  badge?: string; // ex: "Mais Barata", "Programa Gov"
}

export const trustedPharmacies: TrustedPharmacy[] = [
  {
    id: "ultrafarma",
    name: "Ultrafarma",
    slug: "Ultrafarma",
    logo: "💊",
    tagline: "Menores preços online do Brasil",
    type: "online",
    rating: 4.8,
    highlights: ["Preços até 40% menores", "Entrega em todo o Brasil", "Sem taxa de fidelidade"],
    website: "https://www.ultrafarma.com.br",
    hasLoyaltyCard: false,
    color: "#0ea5e9",
    badge: "Mais Barata",
  },
  {
    id: "drogasil",
    name: "Drogasil",
    slug: "Drogasil",
    logo: "🔵",
    tagline: "Referência em confiabilidade",
    type: "chain",
    rating: 4.4,
    highlights: ["Programa Drogasil Mais", "Presença nacional", "Farmacêutico de plantão 24h"],
    website: "https://www.drogasil.com.br",
    hasLoyaltyCard: true,
    loyaltyCardName: "Drogasil Mais",
    color: "#3b82f6",
  },
  {
    id: "paguemenos",
    name: "Pague Menos",
    slug: "Pague Menos",
    logo: "🟡",
    tagline: "Forte no Nordeste, presente no Brasil todo",
    type: "chain",
    rating: 4.3,
    highlights: ["Rede com forte presença no Norte/Nordeste", "Clube Pague Menos", "Delivery expresso"],
    website: "https://www.paguemenos.com.br",
    hasLoyaltyCard: true,
    loyaltyCardName: "Clube Pague Menos",
    color: "#eab308",
  },
  {
    id: "farmacia-popular",
    name: "Farmácia Popular",
    slug: "Farmácia Popular",
    logo: "🏛️",
    tagline: "Programa do Governo Federal — Aqui Tem Farmácia Popular",
    type: "popular",
    rating: 4.9,
    highlights: ["Medicamentos gratuitos ou até 90% de desconto", "Presença em + de 5.000 municípios", "Autorizado pelo Ministério da Saúde"],
    website: "https://www.gov.br/saude/farmacia-popular",
    hasLoyaltyCard: false,
    color: "#10b981",
    badge: "Programa Gov",
  },
];
