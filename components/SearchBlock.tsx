import React, { useRef } from 'react';
import { Search, Zap, Target, X, Loader2, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { SearchMode, SortOption, SortDirection } from '../App';

interface SearchBlockProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: () => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  isBusy: boolean;
  uiOpacity: number;
  
  // Sort Props added
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  sortDirection: SortDirection;
}

export const SearchBlock: React.FC<SearchBlockProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  onSearch,
  searchMode,
  setSearchMode,
  isBusy,
  uiOpacity,
  sortBy,
  setSortBy,
  sortDirection
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const renderSortIcon = (isActive: boolean) => {
      if (!isActive) return <ArrowDownAZ className="w-3 h-3 opacity-50" />;
      return sortDirection === 'asc' ? <ArrowDownAZ className="w-3 h-3" /> : <ArrowUpAZ className="w-3 h-3" />;
  };

  return (
    <div 
        className="h-[15%] w-full px-4 py-2 flex flex-col justify-center relative z-20 transition-colors duration-300"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
      
      {/* Top Row: Mode Toggle AND Sort Buttons */}
      <div className="flex items-center justify-between mb-2 pl-1">
        {/* Left: Mode Toggle */}
        <label className="flex items-center gap-2 cursor-pointer group select-none">
          <div className="relative">
            <input 
              type="checkbox" 
              className="peer sr-only"
              checked={searchMode === 'contains'}
              onChange={() => setSearchMode(searchMode === 'contains' ? 'exact' : 'contains')}
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 shadow-md"></div>
          </div>
          <span className="text-xs font-medium text-slate-300 group-hover:text-emerald-400 transition-colors flex items-center gap-1 drop-shadow-md">
            {searchMode === 'contains' ? (
              <>
                <Zap className="w-3 h-3 text-yellow-400" />
                Contiene
              </>
            ) : (
              <>
                <Target className="w-3 h-3 text-red-400" />
                Esatta
              </>
            )}
          </span>
        </label>

        {/* Right: Sort Buttons (Moved here) */}
        <div className="flex bg-slate-800/60 rounded-lg p-0.5 shadow-md">
            <button
              onClick={() => setSortBy('title')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                sortBy === 'title' 
                  ? (isBusy ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white shadow-sm')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {renderSortIcon(sortBy === 'title')}
              Titolo
            </button>
            <button
              onClick={() => setSortBy('author')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                sortBy === 'author' 
                  ? (isBusy ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white shadow-sm')
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {renderSortIcon(sortBy === 'author')}
              Autore
            </button>
        </div>
      </div>

      {/* Input Row */}
      <div className="w-full flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchMode === 'contains' ? "Cerca..." : "Scrivi e invia..."}
            className={`
              w-full bg-slate-800/60 text-slate-100 rounded-lg py-2.5 pl-4 pr-4 
              focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-md
              transition-colors backdrop-blur-sm placeholder-slate-400
              ${searchMode === 'contains' ? 'border border-emerald-500/30' : 'border border-slate-600/30'}
            `}
          />
        </div>

        {searchMode === 'contains' ? (
            <button
                onClick={handleClear}
                disabled={searchTerm.length === 0}
                className={`
                    px-3.5 rounded-lg shadow-md transition-all flex items-center justify-center active:scale-95
                    ${searchTerm.length > 0 
                        ? 'bg-slate-700/60 hover:bg-red-900/50 text-slate-200 hover:text-red-400' 
                        : 'bg-slate-800/40 text-slate-500 opacity-50 cursor-default'}
                `}
            >
                <X className="w-5 h-5" />
            </button>
        ) : (
            <button
                onClick={onSearch}
                className={`
                    px-3.5 rounded-lg shadow-md transition-colors flex items-center justify-center active:scale-95 border-none
                    ${isBusy 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
                `}
            >
                {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
        )}
      </div>
    </div>
  );
};