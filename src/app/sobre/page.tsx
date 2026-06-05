import { Header } from '@/components/Header';
import Link from 'next/link';

export default function SobrePage() {
  return (
    <main className="min-h-screen bg-background bg-gradient-to-br from-background via-secondary/30 to-muted/50 text-foreground flex flex-col items-center p-6 sm:p-12">
      <Header />
      <div className="w-full max-w-3xl mt-8 space-y-8 text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-4xl font-bold text-foreground mb-6">Sobre o Projeto</h1>
        <p className="leading-relaxed">
          O <strong>Preço Justo</strong> é uma iniciativa para empoderar o consumidor brasileiro na hora de comprar medicamentos. Muitas vezes, por desinformação, acabamos pagando valores abusivos que ultrapassam o teto permitido por lei.
        </p>
        <p className="leading-relaxed">
          Os preços apresentados nesta plataforma são baseados na lista oficial da <strong>CMED (Câmara de Regulação do Mercado de Medicamentos)</strong>, que é vinculada à ANVISA. A CMED estabelece o PMC (Preço Máximo ao Consumidor), que é o valor máximo que qualquer farmácia ou drogaria pode cobrar por um medicamento no Brasil.
        </p>
        <div className="p-6 bg-card border border-border rounded-2xl shadow-xl mt-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Por que os preços variam?
          </h2>
          <p className="text-sm leading-relaxed">
            O imposto estadual (ICMS) incide sobre os medicamentos e varia de estado para estado (geralmente entre 17% e 22%). Por isso, incluímos um seletor de estados para que o cálculo do seu teto seja 100% preciso com a realidade da sua região.
          </p>
        </div>
        <div className="flex justify-center pt-8">
          <Link href="/" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-primary/95 transition-colors shadow-lg">
            Voltar para a Busca
          </Link>
        </div>
      </div>
    </main>
  );
}
