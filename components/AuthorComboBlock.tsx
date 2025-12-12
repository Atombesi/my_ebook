import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, CheckSquare, Square, BookHeart } from 'lucide-react';
import { SortOption, SortDirection } from '../App';

interface AuthorComboBlockProps {
  authors: string[];
  selectedAuthors: string[];
  toggleAuthor: (author: string) => void;
  resetAuthors: () => void;
  // New props for user data filter
  showOnlyUserData: boolean;
  toggleShowOnlyUserData: () => void;
  
  sortBy: SortOption;
  sortDirection: SortDirection;
  isBusy: boolean;
  uiOpacity: number;
}

export const AuthorComboBlock: React.FC<AuthorComboBlockProps> = ({ 
  authors, 
  selectedAuthors, 
  toggleAuthor,
  resetAuthors,
  showOnlyUserData,
  toggleShowOnlyUserData,
  sortBy,
  sortDirection,
  isBusy,
  uiOpacity
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Logic: When open, filter authors by text
  const filteredAuthors = useMemo(() => {
    if (!filterText) return authors;
    return authors.filter(a => a.toLowerCase().includes(filterText.toLowerCase()));
  }, [authors, filterText]);

  // Jump letters (only shown when not filtering)
  const baseLetters = ['A', 'F', 'K', 'P', 'U', 'Z'];
  const shouldReverse = sortBy === 'author' && sortDirection === 'desc';
  const jumpLetters = shouldReverse ? [...baseLetters].reverse() : baseLetters;
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input on open
  useEffect(() => {
      if (isOpen && inputRef.current) {
          inputRef.current.focus();
      } else {
          setFilterText(''); // Reset filter on close
      }
  }, [isOpen]);

  const handleJumpTo = (e: React.MouseEvent, letter: string) => {
      e.stopPropagation(); 
      if (!listRef.current) return;
      const index = filteredAuthors.findIndex(auth => auth.toUpperCase().localeCompare(letter) >= 0);
      if (index !== -1 && listRef.current.children[index + 1]) { // +1 per lo sticky header "Tutti"
          listRef.current.children[index + 1].scrollIntoView({ behavior: 'auto', block: 'start' });
      }
  };

  const getButtonText = () => {
      if (selectedAuthors.length === 0) return "-- Filtra per Autore --";
      if (selectedAuthors.length === 1) return selectedAuthors[0];
      return `${selectedAuthors.length} autori selezionati`;
  };

  return (
    <div 
        className="h-[10%] w-full px-4 py-2 flex flex-col justify-center relative z-30 transition-colors duration-300"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
      <div className="flex gap-2 w-full">
        
        {/* DROPDOWN CONTAINER */}
        <div className="flex-1 flex gap-2 relative min-w-0" ref={dropdownRef}>
            <div className="relative flex-1 min-w-0">
                <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between bg-slate-800/60 text-slate-200 rounded-lg py-2.5 px-3 
                    focus:outline-none shadow-md text-sm transition-all backdrop-blur-sm
                    ${isOpen ? 'ring-2 ring-emerald-500/40' : ''}
                    ${isBusy ? 'text-orange-200' : ''}
                `}
                >
                <span className={`truncate ${selectedAuthors.length > 0 ? (isBusy ? 'text-orange-200' : 'text-white font-medium') : 'text-slate-400 italic'}`}>
                    {getButtonText()}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} shrink-0 ml-2`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 h-72 bg-slate-900/95 border border-slate-600/50 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl">
                        
                        {/* Search Input Sticky Top */}
                        <div className="p-2 border-b border-slate-800/50 bg-slate-950/50">
                            <div className="relative">
                                <Search className="absolute left-2 top-2 w-4 h-4 text-slate-500" />
                                <input 
                                    ref={inputRef}
                                    type="text" 
                                    className="w-full bg-slate-800 rounded px-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
                                    placeholder="Cerca autore..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                />
                                {filterText && (
                                    <button onClick={() => setFilterText('')} className="absolute right-2 top-2 text-slate-500 hover:text-white">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            <ul ref={listRef} className="flex-1 overflow-y-auto py-1 pr-2 custom-scrollbar scroll-smooth">
                                {/* Option: Select All (Clear Filter actually) */}
                                {!filterText && (
                                    <li 
                                        onClick={() => {
                                            resetAuthors();
                                        }}
                                        className="px-3 py-2 text-xs text-slate-300 hover:bg-emerald-900/30 hover:text-white cursor-pointer flex items-center gap-2 border-b border-slate-800/50"
                                    >
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            {selectedAuthors.length === 0 && <Check className="w-3 h-3 text-emerald-500" />}
                                        </div>
                                        <span className="italic">-- Tutti gli Autori --</span>
                                    </li>
                                )}

                                {filteredAuthors.length === 0 ? (
                                    <li className="p-4 text-center text-xs text-slate-500 italic">Nessun autore trovato</li>
                                ) : (
                                    filteredAuthors.map((author) => {
                                        const isSelected = selectedAuthors.includes(author);
                                        return (
                                            <li 
                                                key={author} 
                                                onClick={() => toggleAuthor(author)}
                                                className={`
                                                    px-3 py-2 text-xs cursor-pointer flex items-center gap-2 transition-colors
                                                    ${isSelected 
                                                        ? 'bg-emerald-600/10 text-emerald-100' 
                                                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}
                                                `}
                                            >
                                                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-600" />
                                                    )}
                                                </div>
                                                <span className="truncate">{author}</span>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>

                            {/* Hide jump bar if filtering */}
                            {!filterText && (
                                <div className="w-6 bg-slate-950/50 border-l border-slate-800/50 flex flex-col justify-between items-center py-1 shrink-0">
                                    {jumpLetters.map((letter) => (
                                        <button
                                            key={letter}
                                            onClick={(e) => handleJumpTo(e, letter)}
                                            className="flex-1 w-full flex items-center justify-center text-[9px] font-bold text-slate-500 hover:text-emerald-400 hover:bg-slate-800/50"
                                        >
                                            {letter}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedAuthors.length > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        resetAuthors();
                    }}
                    disabled={isBusy}
                    className={`
                        w-10 flex items-center justify-center rounded-lg shadow-md transition-colors active:scale-95 shrink-0
                        ${isBusy 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-slate-700/60 hover:bg-red-900/50 text-slate-300 hover:text-red-400'}
                    `}
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>

        {/* USER DATA FILTER TOGGLE */}
        <button
            onClick={toggleShowOnlyUserData}
            className={`
                px-3 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1 shrink-0
                ${showOnlyUserData 
                    ? 'bg-indigo-600 text-white shadow-indigo-900/50 ring-1 ring-indigo-400' 
                    : 'bg-slate-800/60 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60'}
            `}
            title="Mostra solo i miei dati (Letti/Annotati)"
        >
            <BookHeart className={`w-5 h-5 ${showOnlyUserData ? 'fill-indigo-500/20' : ''}`} />
        </button>

      </div>
    </div>
  );
};