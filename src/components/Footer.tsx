export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/5 mt-auto pt-12 pb-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">

        {/* Aviso Legal */}
        <div className="w-full max-w-2xl text-center">
          <p className="text-xs text-zinc-600 leading-relaxed">
            ⚠️ <strong className="text-zinc-500">Aviso Legal:</strong> As informações apresentadas são baseadas na{' '}
            <a
              href="https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-zinc-400 transition-colors"
            >
              tabela oficial de preços da CMED/ANVISA
            </a>{' '}
            e têm caráter informativo. Os preços podem variar conforme atualizações da tabela. Consulte sempre a lista oficial em caso de dúvida.
          </p>
        </div>

        {/* Créditos */}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span>© {currentYear} Preço Justo</span>
          <span>·</span>
          <a
            href="https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors"
          >
            Teto legal: CMED/ANVISA
          </a>
          <span>·</span>
          <span>Feito para empoderar o consumidor brasileiro</span>
        </div>
      </div>
    </footer>
  );
}
