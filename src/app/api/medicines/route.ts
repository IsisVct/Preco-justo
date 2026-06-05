import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Medicine } from '@/data/medicines';
import { parseMedicineString, parsePackageInfo } from '@/lib/medicineMatcher';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const activeIngredient = searchParams.get('activeIngredient') || '';

  if (!query && !activeIngredient) {
    return NextResponse.json([]);
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
  }

  let startsWithData: any[] = [];
  let containsData: any[] = [];

  if (activeIngredient) {
    const { data } = await supabase.from('medicines').select('*').eq('active_ingredient', activeIngredient).limit(100);
    containsData = data || [];
  } else {
    // 1ª query: nome ou princípio ativo que COMEÇA com o termo
    const { data: sw } = await supabase
      .from('medicines')
      .select('*')
      .or(`name.ilike.${query}%,active_ingredient.ilike.${query}%`)
      .limit(60);
    startsWithData = sw || [];

    // 2ª query: nome ou princípio ativo que CONTÉM o termo (broader)
    const { data: ct, error } = await supabase
      .from('medicines')
      .select('*')
      .or(`name.ilike.%${query}%,active_ingredient.ilike.%${query}%`)
      .limit(60);

    if (error) {
      console.error('Erro no Supabase:', error);
      return NextResponse.json({ error: 'Erro ao buscar dados no Supabase' }, { status: 500 });
    }
    containsData = ct || [];
  }

  // Mescla: starts-with primeiro, depois contains
  const rawData = [...startsWithData, ...containsData];

  const { data, error } = { data: rawData, error: null };
    
  if (error) {
    console.error('Erro no Supabase:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados no Supabase' }, { status: 500 });
  }
  
  // Converte de snake_case (banco) para camelCase usando o novo modelo e fallbacks de parsing
  const formattedData: Medicine[] = (data || []).map(med => {
    const combinedText = `${med.name} ${med.description || ''}`;
    const parsedName = parseMedicineString(combinedText);
    const parsedPkg = parsePackageInfo(med.description || '');

    const isGeneric = med.is_generic 
      ? true 
      : (
          combinedText.toLowerCase().includes('genérico') || 
          combinedText.toLowerCase().includes('generico') ||
          med.name.toLowerCase().trim() === med.active_ingredient.toLowerCase().trim()
        );

    const quantity = med.quantity || parsedPkg.quantity || parsedName.quantity;
    const form = med.form || parsedPkg.unit || parsedName.form;

    return {
      id: med.id,
      name: med.name,
      activeIngredient: med.active_ingredient,
      laboratory: med.laboratory,
      maxPrice: med.max_price,
      description: med.description || '',
      dosage: med.dosage || parsedName.dosage,
      quantity: quantity,
      form: form,
      isGeneric: isGeneric,
      susAvailability: {
        sus: med.sus_availability || false,
        farmaciapopular: med.farmaciapopular_availability || false,
        note: med.sus_note || undefined,
      },
      pharmacyPrices: [],
    };
  });

  // Remove duplicados
  const uniqueMedicines: Medicine[] = [];
  const seenKeys = new Set<string>();

  for (const med of formattedData) {
    const nameKey = med.name.toLowerCase().trim();
    const descKey = (med.description || '').toLowerCase().trim();
    const labKey = (med.laboratory || '').toLowerCase().trim();
    const key = `${nameKey}|${descKey}|${labKey}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueMedicines.push(med);
    }
  }

  // Ordena por relevância: exato > começa-com > contém
  const q = query.toLowerCase().trim();
  uniqueMedicines.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aAI   = (a.activeIngredient || '').toLowerCase();
    const bAI   = (b.activeIngredient || '').toLowerCase();

    const score = (name: string, ai: string) => {
      if (name === q)             return 0; // nome exato
      if (ai === q)               return 1; // princípio ativo exato
      if (name.startsWith(q))     return 2; // nome começa com
      if (ai.startsWith(q))       return 3; // princípio ativo começa com
      if (name.includes(q))       return 4; // nome contém
      return 5;                             // princípio ativo contém
    };

    const diff = score(aName, aAI) - score(bName, bAI);
    if (diff !== 0) return diff;
    return aName.localeCompare(bName);
  });

  return NextResponse.json(uniqueMedicines.slice(0, 15));

}

