'use client';
import { SusAvailability } from '@/data/medicines';
import { motion } from 'framer-motion';

interface SusAvailabilityBadgeProps {
  availability: SusAvailability;
}

export function SusAvailabilityBadge({ availability }: SusAvailabilityBadgeProps) {
  const isFree = availability.sus || availability.farmaciapopular;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border p-4 flex items-start gap-4 ${
        isFree
          ? 'bg-emerald-950/40 border-emerald-700/40'
          : 'sus-private-card bg-zinc-900/60 border-zinc-700/40'
      }`}
    >
      {/* Glow de fundo */}
      {isFree && (
        <div className="absolute -top-6 -left-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Ícone */}
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
        isFree ? 'bg-emerald-500/15 text-emerald-400' : 'sus-private-icon bg-zinc-800 text-zinc-400'
      }`}>
        {isFree ? '🏥' : '🏪'}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {availability.sus && (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-600/40 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              SUS Gratuito
            </span>
          )}
          {availability.farmaciapopular && (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-600/40 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              Farmácia Popular
            </span>
          )}
          {!isFree && (
            <span className="sus-private-badge inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full px-2.5 py-0.5">
              Apenas Varejo Privado
            </span>
          )}
        </div>

        <p className={`text-sm leading-relaxed ${isFree ? 'text-emerald-100/80' : 'sus-private-note text-zinc-400'}`}>
          {availability.note}
        </p>

        {isFree && (
          <a
            href={availability.farmaciapopular ? "https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/f/farmacia-popular" : "https://meususdigital.saude.gov.br/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {availability.farmaciapopular ? "Como retirar na Farmácia Popular" : "Acessar Meu SUS Digital para localizar UBS"}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </motion.div>
  );
}
