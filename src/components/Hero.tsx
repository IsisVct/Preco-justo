'use client';
import { motion } from 'framer-motion';

export function Hero() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex flex-col items-center"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="inline-flex items-center px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
      >
        Baseado na Tabela Oficial da ANVISA (CMED)
      </motion.div>
      
      <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 pb-2">
        Não pague mais caro do que a lei permite.
      </h2>
      
      <p className="text-lg text-zinc-400 max-w-2xl mt-6">
        Consulte o Preço Máximo ao Consumidor (PMC) de qualquer medicamento e descubra imediatamente se a farmácia cobrou um valor abusivo.
      </p>
    </motion.div>
  );
}
