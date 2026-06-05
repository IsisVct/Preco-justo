import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { medicine, email, targetPrice, maxPrice } = body;

    if (!medicine || !email || targetPrice === undefined) {
      return NextResponse.json(
        { error: 'Dados incompletos para criar o alerta' },
        { status: 400 }
      );
    }

    if (supabase) {
      // Insere no banco de dados se o Supabase estiver configurado
      const { data, error } = await supabase
        .from('alerts')
        .insert([
          {
            medicine_name: medicine,
            user_email: email,
            target_price: targetPrice,
            original_max_price: maxPrice,
            status: 'active'
          }
        ])
        .select();

      if (error) {
        console.error('Erro ao inserir alerta no Supabase:', error);
        return NextResponse.json(
          { error: 'Erro ao salvar o alerta no banco de dados' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    // Fallback: se não tiver Supabase configurado, retorna sucesso (mock)
    // Na vida real, poderíamos disparar um e-mail de confirmação aqui via Resend, Sendgrid, etc.
    return NextResponse.json(
      { success: true, message: 'Alerta recebido (Mock Mode)' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erro na API de alertas:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
