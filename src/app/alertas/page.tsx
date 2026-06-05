'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import Link from 'next/link';

interface Alert {
  id: string;
  medicine: string;
  email: string;
  targetPrice: number;
  createdAt: string;
}

const STORAGE_KEY = 'remediolivre_alerts';

export default function MeusAlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedAlerts = localStorage.getItem(STORAGE_KEY);
    if (storedAlerts) {
      try {
        setAlerts(JSON.parse(storedAlerts));
      } catch (error) {
        console.error('Erro ao ler alertas locais:', error);
      }
    }
  }, []);

  const handleDelete = (id: string) => {
    const updatedAlerts = alerts.filter(alert => alert.id !== id);
    setAlerts(updatedAlerts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlerts));
  };

  if (!mounted) return null; // Prevenir erro de hidratação

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-20 right-10 w-48 h-48 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <Header />

      <div className="w-full max-w-3xl flex flex-col items-center relative z-10 mt-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800 mb-4 shadow-xl">
            <span className="text-3xl">🔔</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Meus <span className="text-primary">Alertas</span>
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Acompanhe aqui os medicamentos que você está monitorando. Avisaremos no seu e-mail assim que o preço cair.
          </p>
        </div>

        {alerts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-zinc-900/40 border border-zinc-800/80 border-dashed rounded-[24px] p-12 text-center flex flex-col items-center gap-4"
          >
            <span className="text-4xl opacity-50">📭</span>
            <h3 className="text-xl font-bold text-zinc-300">Nenhum alerta ativo</h3>
            <p className="text-zinc-500 max-w-sm">
              Você ainda não configurou nenhum alerta de preço. Busque um medicamento e ative um alerta para economizar!
            </p>
            <Link 
              href="/"
              className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors border border-zinc-700"
            >
              Buscar Medicamentos
            </Link>
          </motion.div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  layout
                  className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-white">{alert.medicine}</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Ativo
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Notificar em: <span className="text-zinc-200">{alert.email}</span>
                    </p>
                    <p className="text-xs text-zinc-600 mt-2">
                      Criado em {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-zinc-800/80 pt-4 sm:pt-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Preço Alvo</span>
                      <span className="text-xl font-bold text-primary tabular-nums">
                        R$ {alert.targetPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="text-red-400/50 hover:text-red-400 bg-red-400/5 hover:bg-red-400/10 p-2.5 rounded-xl transition-all"
                      title="Excluir Alerta"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
