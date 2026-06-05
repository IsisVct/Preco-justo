export interface PharmacyPrice {
  name: string;
  price: number;
  originalPrice?: number; // Preço original (De/Por)
  requiresCpf?: boolean;  // Se exige cadastro fidelidade/laboratório
  url?: string;
  discount?: number;      // % de desconto com cartão fidelidade
}

export interface SusAvailability {
  sus: boolean;
  farmaciapopular: boolean;
  note?: string;
}

export interface Medicine {
  id: string;
  name: string;
  activeIngredient: string;
  laboratory: string;
  maxPrice: number;
  description?: string;      // Apresentação/descrição do produto
  
  // Novos campos padronizados
  dosage: string | null;     // ex: "50mg", "1g"
  quantity: number | null;   // ex: 30, 10
  form: string | null;       // ex: "comprimidos", "cápsulas"
  isGeneric: boolean;
  
  susAvailability?: SusAvailability;
  pharmacyPrices?: PharmacyPrice[];
}

export const medicinesDB: Medicine[] = [
  {
    id: "1",
    name: "Dipirona Monoidratada 500mg",
    activeIngredient: "Dipirona Monoidratada",
    laboratory: "Medley",
    maxPrice: 15.50,
    description: "500MG COM CT BL AL PLAS TRANS X 10",
    dosage: "500mg",
    quantity: 10,
    form: "comprimidos",
    isGeneric: true,
    susAvailability: {
      sus: true,
      farmaciapopular: true,
      note: "Disponível gratuitamente nas Unidades Básicas de Saúde (UBS) e credenciadas da Farmácia Popular."
    },
    pharmacyPrices: [
      { name: "Ultrafarma", price: 4.50, originalPrice: 6.90, requiresCpf: false },
      { name: "Drogasil", price: 5.90, originalPrice: 7.20, requiresCpf: true },
      { name: "Pague Menos", price: 5.50, originalPrice: 7.00, requiresCpf: true }
    ]
  },
  {
    id: "2",
    name: "Rivotril 2mg",
    activeIngredient: "Clonazepam",
    laboratory: "Roche",
    maxPrice: 22.80,
    description: "2MG COM CT BL AL PLAS INC X 30",
    dosage: "2mg",
    quantity: 30,
    form: "comprimidos",
    isGeneric: false,
    susAvailability: {
      sus: true,
      farmaciapopular: false,
      note: "Disponível mediante Receita Azul (B1) em postos de saúde municipais autorizados."
    },
    pharmacyPrices: [
      { name: "Ultrafarma", price: 18.50, originalPrice: 21.00, requiresCpf: false },
      { name: "Drogasil", price: 19.90, originalPrice: 22.00, requiresCpf: false },
      { name: "Pague Menos", price: 19.50, originalPrice: 21.80, requiresCpf: false }
    ]
  },
  {
    id: "3",
    name: "Neosaldina",
    activeIngredient: "Dipirona + Mucato de Isometepteno + Cafeína",
    laboratory: "Takeda",
    maxPrice: 32.40,
    description: "DRG CT BL AL PLAS INC X 30",
    dosage: "30 drágeas",
    quantity: 30,
    form: "drágeas",
    isGeneric: false,
    susAvailability: {
      sus: false,
      farmaciapopular: false,
      note: "Medicamento isento de prescrição. Não participante de programas governamentais de distribuição."
    },
    pharmacyPrices: [
      { name: "Ultrafarma", price: 24.90, originalPrice: 29.90, requiresCpf: false },
      { name: "Drogasil", price: 27.80, originalPrice: 31.90, requiresCpf: true },
      { name: "Pague Menos", price: 26.50, originalPrice: 30.50, requiresCpf: true }
    ]
  },
  {
    id: "4",
    name: "Ozempic 1,34mg/ml",
    activeIngredient: "Semaglutida",
    laboratory: "Novo Nordisk",
    maxPrice: 1049.00,
    description: "1,34 MG/ML SOL INJ CT 1 CARPINHO + 4 AGULHAS",
    dosage: "1.34mg/ml",
    quantity: 1,
    form: "sistema de aplicação",
    isGeneric: false,
    susAvailability: {
      sus: false,
      farmaciapopular: false,
      note: "Não fornecido pelo SUS nem pela Farmácia Popular para tratamento de Diabetes Tipo 2 ou Obesidade."
    },
    pharmacyPrices: [
      { name: "Ultrafarma", price: 899.00, originalPrice: 999.00, requiresCpf: false },
      { name: "Drogasil", price: 920.00, originalPrice: 1010.00, requiresCpf: true },
      { name: "Pague Menos", price: 915.00, originalPrice: 1005.00, requiresCpf: true }
    ]
  },
  {
    id: "5",
    name: "Glifage XR 500mg",
    activeIngredient: "Cloridrato de Metformina",
    laboratory: "Merck",
    maxPrice: 12.30,
    description: "500MG COM LIB PROL CT BL AL PLAS INC X 30",
    dosage: "500mg",
    quantity: 30,
    form: "comprimidos",
    isGeneric: false,
    susAvailability: {
      sus: true,
      farmaciapopular: true,
      note: "Disponível gratuitamente no programa Farmácia Popular e postos do SUS para Diabetes Tipo 2."
    },
    pharmacyPrices: [
      { name: "Ultrafarma", price: 8.50, originalPrice: 11.00, requiresCpf: false },
      { name: "Drogasil", price: 9.90, originalPrice: 11.80, requiresCpf: false },
      { name: "Pague Menos", price: 9.50, originalPrice: 11.50, requiresCpf: false }
    ]
  }
];
