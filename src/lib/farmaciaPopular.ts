export const FARMACIA_POPULAR_FREE = [
    // Asma
    "brometo de ipratrópio",
    "dipropionato de beclometasona",
    "sulfato de salbutamol",
    // Diabetes
    "cloridrato de metformina",
    "glibenclamida",
    "insulina humana",
    "insulina humana regular",
    // Hipertensão
    "atenolol",
    "captopril",
    "cloridrato de propranolol",
    "hidroclorotiazida",
    "losartana potássica",
    "maleato de enalapril",
    "espironolactona",
    "furosemida",
    "indapamida",
    // Anticoncepcionais
    "acetato de medroxiprogesterona",
    "etinilestradiol",
    "levonorgestrel",
    "noretisterona",
    "valerato de estradiol",
    "enantato de noretisterona",
    // Osteoporose
    "alendronato de sódio"
];

export const FARMACIA_POPULAR_COPAY = [
    // Dislipidemia
    "sinvastatina",
    // Doença de Parkinson
    "carbidopa",
    "levodopa",
    "cloridrato de benserazida",
    // Glaucoma
    "maleato de timolol",
    // Rinite
    "budesonida",
    // Fraldas
    "fralda geriátrica"
];

export function checkFarmaciaPopular(activeIngredient: string) {
    if (!activeIngredient) return null;
    const lower = activeIngredient.toLowerCase();
    
    // Check Free
    for (const item of FARMACIA_POPULAR_FREE) {
        if (lower.includes(item)) {
            return {
                type: 'free',
                note: "Disponível GRATUITAMENTE no SUS e na Farmácia Popular. Apresente receita médica e documento oficial com foto."
            };
        }
    }

    // Check Copay
    for (const item of FARMACIA_POPULAR_COPAY) {
        if (lower.includes(item)) {
            return {
                type: 'copay',
                note: "Disponível na Farmácia Popular no modelo de copagamento (desconto de até 90%). Apresente receita médica e documento."
            };
        }
    }

    return null;
}
