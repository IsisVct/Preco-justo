'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceAlertModalProps {
  medicineName: string;
  maxPrice: number; // Teto ANVISA calculado
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'remediolivre_alerts';

export function PriceAlertModal({ medicineName, maxPrice, isOpen, onClose }: PriceAlertModalProps) {
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState(Math.round(maxPrice * 0.90 * 100) / 100);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetar o modal ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setEmailError('');
      setTargetPrice(Math.round(maxPrice * 0.90 * 100) / 100);
    }
  }, [isOpen, maxPrice]);

  const validate = () => {
    if (!email.trim()) {
      setEmailError('Informe seu e-mail para receber o alerta.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('E-mail inválido. Verifique e tente novamente.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine: medicineName,
          email,
          targetPrice,
          maxPrice,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta da API');
      }

      // Salva no localStorage como backup local para histórico
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const newAlert = {
        id: `${Date.now()}`,
        medicine: medicineName,
        email,
        targetPrice,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, newAlert]));

      setStep('success');
    } catch (error) {
      console.error('Erro ao salvar alerta:', error);
      setEmailError('Ocorreu um erro ao processar o alerta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const savingsVsTeto = ((maxPrice - targetPrice) / maxPrice * 100).toFixed(0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-md bg-[#111113] border border-zinc-800 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
              
              {/* Header do modal */}
              <div className="relative p-6 pb-4 border-b border-zinc-800/80">
                <div className="absolute top-0 right-0 w-48 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🔔</span>
                      <h3 className="text-lg font-bold text-white">Alerta de Promoção</h3>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Avise-me quando <span className="text-zinc-200 font-medium">{medicineName}</span> ficar abaixo do preço-alvo.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <AnimatePresence mode="wait">
                {step === 'form' ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 flex flex-col gap-5"
                  >
                    {/* Preço-alvo slider */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-300">
                          Me avise quando o preço cair abaixo de:
                        </label>
                        <span className="text-xl font-bold text-primary tabular-nums">
                          R$ {targetPrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {/* Contexto de referência */}
                      <div className="flex justify-between text-[11px] text-zinc-500 px-1">
                        <span>R$ {(maxPrice * 0.5).toFixed(2).replace('.', ',')} (50% do teto)</span>
                        <span className="text-orange-400">R$ {maxPrice.toFixed(2).replace('.', ',')} (Teto)</span>
                      </div>

                      <input
                        type="range"
                        min={maxPrice * 0.5}
                        max={maxPrice}
                        step={0.50}
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
                        className="w-full accent-primary cursor-pointer"
                      />

                      {/* Badge de economia */}
                      <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>
                          Você economizará <strong>{savingsVsTeto}%</strong> em relação ao teto da ANVISA
                        </span>
                      </div>
                    </div>

                    {/* Campo de e-mail */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-zinc-300">
                        Seu e-mail
                      </label>
                      <input
                        type="email"
                        placeholder="voce@exemplo.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                        className={`bg-zinc-900 border rounded-xl py-2.5 px-4 text-white text-sm w-full focus:outline-none focus:ring-2 transition-all ${
                          emailError
                            ? 'border-red-500/60 focus:ring-red-500/30'
                            : 'border-zinc-700 focus:ring-primary/30 focus:border-primary/50'
                        }`}
                      />
                      {emailError && (
                        <p className="text-xs text-red-400">{emailError}</p>
                      )}
                    </div>

                    {/* Nota do MVP */}
                    <p className="text-[11px] text-zinc-600 leading-relaxed bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-3 py-2">
                      🛠️ <strong className="text-zinc-500">Aviso:</strong> O alerta será salvo no nosso banco de dados. 
                      Sempre que o preço cair, tentaremos te notificar por e-mail (funcionalidade em testes).
                    </p>

                    {/* Botão de ação */}
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Salvando...' : '🔔 Ativar Alerta'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 flex flex-col items-center text-center gap-4"
                  >
                    {/* Ícone animado */}
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                      className="w-20 h-20 bg-emerald-500/15 border border-emerald-600/30 rounded-2xl flex items-center justify-center text-4xl"
                    >
                      ✅
                    </motion.div>

                    <div>
                      <h4 className="text-xl font-bold text-white mb-1">Alerta Ativado!</h4>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        Você será notificado quando <span className="text-zinc-200 font-medium">{medicineName}</span> ficar abaixo de{' '}
                        <span className="text-emerald-300 font-bold">R$ {targetPrice.toFixed(2).replace('.', ',')}</span>.
                      </p>
                    </div>

                    <button
                      onClick={onClose}
                      className="mt-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-4"
                    >
                      Fechar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
