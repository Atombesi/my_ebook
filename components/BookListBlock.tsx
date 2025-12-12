import React, { useRef, useEffect } from 'react';
import { Book, BookNotes } from '../types';
import { User, CheckCircle2, Bookmark, Loader2 } from 'lucide-react';
import { SortOption, SortDirection } from '../App';
import { getBookKey } from '../services/csvService';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface BookListBlockProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  selectedBookId: string | undefined;
  sortBy: SortOption;
  sortDirection: SortDirection;
  uiOpacity: number;
  bookNotes: BookNotes;
  isLoading: boolean;
}

// Interfaccia per i dati passati alla singola riga (Row)
interface RowData {
  books: Book[];
  onSelectBook: (book: Book) => void;
  selectedBookId: string | undefined;
  bookNotes: BookNotes;
}

// Componente Riga Virtualizzata (Renderizzato solo quando visibile)
const BookRow = ({ index, style, data }: ListChildComponentProps<RowData>) => {
  const { books, onSelectBook, selectedBookId, bookNotes } = data;
  const book = books[index];
  
  if (!book) return null;

  const key = getBookKey(book);
  const noteEntry = bookNotes[key]; 
  const status = noteEntry?.status; 

  // Determinazione stile in base allo stato
  let titleClass = "text-slate-100"; 
  let statusIcon = null;

  if (status === 'READ') {
      titleClass = "text-emerald-400";
      statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  } else if (status === 'TO_READ') {
      titleClass = "text-yellow-400";
      statusIcon = <Bookmark className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
  }

  if (selectedBookId === book.id) {
     titleClass = status ? titleClass : "text-emerald-100";
  }

  // Nota: lo 'style' passato da react-window è essenziale per il posizionamento assoluto
  // Aggiungiamo un margine laterale (left/right/width adjustment) per non sovrapporsi alla barra jump
  const adjustedStyle = {
      ...style,
      width: `calc(${style.width} - 32px)`, // Lascia spazio alla barra A-Z
      left: 0, // Assicura allineamento a sinistra
  };

  return (
    <div style={adjustedStyle} className="px-2">
        <div
            onClick={() => onSelectBook(book)}
            className={`
            h-[58px] w-full px-2 rounded-lg cursor-pointer transition-all duration-200
            flex flex-col justify-center gap-0.5 shadow-sm 
            ${selectedBookId === book.id 
                ? 'bg-emerald-900/90 ring-1 ring-emerald-500/50 backdrop-blur-sm' 
                : 'hover:bg-slate-600/30 bg-transparent border-b border-slate-700/20'}
            `}
        >
            <div className="flex items-start justify-between gap-2">
                <span className={`font-medium text-sm line-clamp-1 ${titleClass}`}>
                {book.title}
                </span>
                {statusIcon}
            </div>
            
            <div className="flex items-center gap-1 text-[11px] text-slate-300">
            <User className="w-3 h-3 opacity-70" />
            <span className="truncate">{book.author}</span>
            </div>
        </div>
    </div>
  );
};

export const BookListBlock: React.FC<BookListBlockProps> = ({ books, onSelectBook, selectedBookId, sortBy, sortDirection, uiOpacity, bookNotes, isLoading }) => {
  const listRef = useRef<List>(null);
  
  const baseLetters = ['A', 'F', 'K', 'P', 'U', 'Z'];
  const jumpLetters = sortDirection === 'asc' ? baseLetters : [...baseLetters].reverse();

  // Reset scroll quando cambia la lista o l'ordinamento
  useEffect(() => {
    if (listRef.current && books.length > 0) {
        listRef.current.scrollTo(0);
    }
  }, [books, sortBy, sortDirection]);

  const handleJumpTo = (letter: string) => {
      if (!listRef.current) return;

      const index = books.findIndex(book => {
          const textToCheck = (sortBy === 'author' ? book.author : book.title).toUpperCase();
          if (sortDirection === 'asc') {
             return textToCheck.localeCompare(letter) >= 0;
          } else {
             return textToCheck.localeCompare(letter) <= 0;
          }
      });

      if (index !== -1) {
          // scrollToItem porta l'elemento in cima alla vista
          listRef.current.scrollToItem(index, 'start');
      }
  };

  if (isLoading) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="bg-slate-900/50 px-4 py-2 rounded-lg backdrop-blur-sm animate-pulse text-sm">
                Caricamento in corso...
            </p>
        </div>
      );
  }

  if (books.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-400 bg-transparent">
        <p className="bg-slate-900/50 px-4 py-2 rounded-lg backdrop-blur-sm">Nessun libro trovato.</p>
      </div>
    );
  }

  // Prepara i dati da passare alle righe (evita di ricreare l'oggetto ad ogni render se possibile, ma qui è leggero)
  const itemData: RowData = {
      books,
      onSelectBook,
      selectedBookId,
      bookNotes
  };

  return (
    <div 
        className="h-full w-full relative flex transition-colors duration-300"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
      
      {/* Container Lista Virtualizzata */}
      <div className="flex-1 h-full pr-8">
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={books.length}
                itemSize={64} // Altezza fissa di ogni riga (58px + margin/border approx)
                itemData={itemData}
                className="no-scrollbar"
                style={{ overflowX: 'hidden' }}
              >
                {BookRow}
              </List>
            )}
          </AutoSizer>
      </div>

      {/* Jump Bar Laterale */}
      <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-between items-center py-2 bg-slate-900/20 backdrop-blur-sm z-10">
          {jumpLetters.map((letter) => (
              <button
                key={letter}
                onClick={() => handleJumpTo(letter)}
                className="w-full flex-1 flex items-center justify-center text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:bg-slate-800/30 transition-colors drop-shadow-sm"
              >
                  {letter}
              </button>
          ))}
      </div>
    </div>
  );
};