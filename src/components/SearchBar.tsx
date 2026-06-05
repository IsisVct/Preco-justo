'use client';
import { useRef, useEffect, useState } from 'react';
import { Medicine } from '@/data/medicines';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Medicine[];
  setSearchResults: (results: Medicine[]) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  onSelectMedicine: (med: Medicine) => void;
  onNewSearch: () => void;
}

export function SearchBar({
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  showDropdown,
  setShowDropdown,
  onSelectMedicine,
  onNewSearch
}: SearchBarProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suppressDropdown = useRef(false);
  const [isSearching, setIsSearching] = useState(false);

  function highlight(text: string, query: string) {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-primary rounded px-0.5 not-italic font-bold">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowDropdown]);

  // Debounce da busca na API
  useEffect(() => {
    const fetchMedicines = async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      // Bloqueia o dropdown se o usuário acabou de selecionar um item
      if (suppressDropdown.current) {
        suppressDropdown.current = false;
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/medicines?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
        setShowDropdown(true);
      } catch (error) {
        console.error("Erro ao buscar medicamentos:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchMedicines();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, setSearchResults, setShowDropdown]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNewSearch(); // Limpa o resultado anterior ao começar nova busca
    suppressDropdown.current = false; // Libera o dropdown para buscas manuais
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = () => {
    if (searchResults.length > 0) {
      suppressDropdown.current = true;
      onSelectMedicine(searchResults[0]);
    }
  };

  const handleItemClick = (med: Medicine) => {
    suppressDropdown.current = true; // Bloqueia o fetch de reabrir o dropdown
    onSelectMedicine(med);
  };

  return (
    <div className="w-full mt-8 relative group" ref={dropdownRef}>
      <div className="absolute -inset-1 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative">
        <input
          type="text"
          placeholder="Ex: Rivotril, Dipirona, Neosaldina..."
          className="relative w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-2xl"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => {/* não reabre o dropdown ao focar */}}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearchSubmit();
          }}
        />
        <button 
          onClick={handleSearchSubmit}
          className="absolute right-2 top-2 bottom-2 bg-white text-black px-6 rounded-xl font-medium hover:bg-zinc-200 transition-colors z-10 flex items-center gap-2">
          {isSearching ? 'Buscando...' : 'Consultar'}
        </button>
      </div>

      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {searchResults.map((med) => (
            <button
              key={med.id}
              onClick={() => handleItemClick(med)}
              className="w-full text-left px-6 py-4 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 flex flex-col sm:flex-row sm:items-center justify-between"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-base">{highlight(med.name, searchQuery)}</span>
                  {med.isGeneric && (
                    <span className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                      Genérico
                    </span>
                  )}
                </div>
                {med.description && (
                  <div className="text-xs text-zinc-400 mt-1 font-mono leading-relaxed break-words">
                    {med.description}
                  </div>
                )}
                <div className="text-xs text-zinc-500 mt-1">
                  {highlight(med.activeIngredient, searchQuery)}
                </div>
              </div>
              <div className="text-left sm:text-right mt-2 sm:mt-0 shrink-0">
                <div className="text-xs text-zinc-400 font-semibold tracking-wider bg-zinc-800 px-2.5 py-1 rounded border border-zinc-700/50 inline-block uppercase">
                  {med.laboratory}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {showDropdown && searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-center animate-in fade-in slide-in-from-top-2">
          <p className="text-zinc-400">Nenhum medicamento encontrado para &quot;{searchQuery}&quot;.</p>
          <p className="text-xs text-zinc-500 mt-2">Tente buscar pelo princípio ativo (ex: Dipirona).</p>
        </div>
      )}
    </div>
  );
}
