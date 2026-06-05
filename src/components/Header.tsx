'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon } from 'lucide-react';

export function Header() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  };

  return (
    <header className="w-full max-w-5xl flex justify-between items-center py-4 mb-12 border-b border-border">
      <Link href="/" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
        <img src="/logo-icon.png" alt="Preço Justo Icon" className="w-12 h-12 object-contain shrink-0" />
        <h1 className="text-2xl font-bold" style={{ fontFamily: "Work Sans, sans-serif" }}>
          <span className="text-[#263095] dark:text-[#3f4bc3]">Preço</span>
          <span className="text-[#10b981] dark:text-[#34d399]"> Justo</span>
        </h1>
      </Link>
      <div className="flex items-center gap-6">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <Link href="/sobre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Sobre
        </Link>
      </div>
    </header>
  );
}
