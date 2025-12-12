import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Book, AppData, AppSettings, BookNotes, BookStatus } from './types';
import { initializeFileSystem, loadData, loadSettings, loadNotes, saveNotes, getBookKey } from './services/csvService';
import { Header } from './components/Header';
import { SearchBlock } from './components/SearchBlock';
import { AuthorComboBlock } from './components/AuthorComboBlock';
import { BookListBlock } from './components/BookListBlock';
import { DetailBlock } from './components/DetailBlock';
import { StatusModal, StatusModalState } from './components/StatusModal';
import { NoteModal } from './components/NoteModal';

// --- CONFIGURAZIONE SFONDO ---
const BACKGROUND_IMAGE_URL = '/background.jpg'; 

export type SortOption = 'title' | 'author';
export type SortDirection = 'asc' | 'desc';
export type SearchMode = 'contains' | 'exact';

const App: React.FC = () => {
  const [data, setData] = useState<AppData>({ metadata: null, books: [] });
  const [bookNotes, setBookNotes] = useState<BookNotes>({}); // Stato delle note
  const [isAppLoading, setIsAppLoading] = useState(true); // Stato di caricamento iniziale
  
  // UI States (Unified Opacity)
  const [uiOpacity, setUiOpacity] = useState(0.3); 

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('contains'); 
  
  // Filter/Sort States
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // USER DATA FILTER
  const [showOnlyUserData, setShowOnlyUserData] = useState(false);

  // UI Processing State
  const [isBusy, setIsBusy] = useState(false);

  // --- MODALS STATE ---
  const [statusModal, setStatusModal] = useState<StatusModalState & { book?: Book }>({
      isOpen: false,
      targetStatus: null,
      actionType: 'ADD'
  });

  const [noteModal, setNoteModal] = useState<{
      isOpen: boolean;
      book: Book | null;
      initialText: string;
  }>({ isOpen: false, book: null, initialText: '' });


  // WATCHDOG
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isBusy) {
        timeoutId = setTimeout(() => {
            console.warn("Watchdog: Operazione troppo lunga, sblocco forzato UI.");
            setIsBusy(false);
        }, 10000);
    }
    return () => {
        if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isBusy]);

  const refreshAppData = useCallback(() => {
    // Simuliamo un minimo di caricamento per evitare flash
    setIsAppLoading(true);
    requestAnimationFrame(() => {
        const loadedData = loadData();
        const loadedNotes = loadNotes();
        setData(loadedData);
        setBookNotes(loadedNotes);
        setSelectedBook(null); 
        setIsAppLoading(false);
    });
  }, []);

  // Caricamento iniziale impostazioni
  const refreshSettings = useCallback(() => {
      const settings = loadSettings();
      if (settings.uiOpacity !== undefined) setUiOpacity(settings.uiOpacity);
  }, []);

  // Callback ottimizzata per aggiornamento immediato post-salvataggio
  const handleSettingsSaved = (newSettings: AppSettings) => {
      if (newSettings.uiOpacity !== undefined) setUiOpacity(newSettings.uiOpacity);
  };

  // --- LOGICA NOTE E STATO ---

  // Trigger dal DetailBlock per chiedere conferma cambio stato
  const requestStatusChange = (book: Book, targetStatus: BookStatus | null, actionType: 'ADD' | 'REMOVE' | 'SWITCH') => {
      setStatusModal({
          isOpen: true,
          book,
          targetStatus,
          actionType,
          bookTitle: book.title
      });
  };

  // Esecuzione effettiva dopo conferma nel modale
  const handleStatusConfirm = (ratingFromModal?: number) => {
      const { book, targetStatus } = statusModal;
      if (!book) return;

      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      if (targetStatus === null) {
          // Rimuovi SOLO lo stato (e rating se presente), mantieni la nota
          delete currentEntry.status;
          delete currentEntry.rating; // Reset rating on clear status
          
          // Se l'oggetto è vuoto (no status, no note), pulisci
          if (!currentEntry.note) {
              delete updatedNotes[key];
          } else {
              updatedNotes[key] = currentEntry;
          }
      } else {
          // Imposta stato
          
          // Gestione Rating:
          // Se targetStatus è 'READ', usa il rating dal modale (se c'è), altrimenti mantieni quello vecchio (se c'era), o metti undefined se 0.
          // Se targetStatus è 'TO_READ', rimuovi rating.
          
          let newRating: number | undefined = currentEntry.rating;

          if (targetStatus === 'READ') {
              newRating = ratingFromModal && ratingFromModal > 0 ? ratingFromModal : (currentEntry.rating || undefined);
          } else if (targetStatus === 'TO_READ') {
              newRating = undefined;
          }

          updatedNotes[key] = {
              ...currentEntry,
              status: targetStatus,
              rating: newRating,
              updatedAt: new Date().toISOString()
          };
      }

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
      setStatusModal({ ...statusModal, isOpen: false });
  };

  // Salvataggio Rating (chiamato direttamente dal DetailBlock - modifica postuma)
  const handleRateBook = (book: Book, rating: number) => {
      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      // Se metto un rating, assumo che il libro sia LETTO
      const newStatus: BookStatus = 'READ';

      if (rating === 0) {
          delete currentEntry.rating;
      } else {
          currentEntry.rating = rating;
      }

      updatedNotes[key] = {
          ...currentEntry,
          status: newStatus,
          updatedAt: new Date().toISOString()
      };

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
  };

  // Trigger dal DetailBlock per aprire editor note
  const requestNoteEdit = (book: Book) => {
      const key = getBookKey(book);
      const currentEntry = bookNotes[key];
      setNoteModal({
          isOpen: true,
          book,
          initialText: currentEntry?.note || ''
      });
  };

  // Salvataggio Nota
  const handleNoteSave = (text: string) => {
      const { book } = noteModal;
      if (!book) return;

      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      if (!text || text.trim() === '') {
          // Cancella nota
          delete currentEntry.note;
          if (!currentEntry.status) {
              delete updatedNotes[key];
          } else {
              updatedNotes[key] = currentEntry;
          }
      } else {
          // Salva nota
          updatedNotes[key] = {
              ...currentEntry,
              note: text,
              updatedAt: new Date().toISOString()
          };
      }

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
  };

  useEffect(() => {
    initializeFileSystem();
    refreshAppData();
    refreshSettings();
  }, [refreshAppData, refreshSettings]);

  const uniqueAuthors = useMemo(() => {
    const authors = new Set(data.books.map((b) => b.author));
    return Array.from(authors).sort((a: string, b: string) => a.localeCompare(b));
  }, [data.books]);

  // --- FILTER & SORT LOGIC ---
  const filteredBooks = useMemo(() => {
    let result = data.books.filter((book) => {
      
      // 1. User Data Filter (Top Priority)
      if (showOnlyUserData) {
          const key = getBookKey(book);
          const entry = bookNotes[key];
          // Keep if entry exists AND (has status OR has note)
          if (!entry || (!entry.status && !entry.note)) {
              return false;
          }
      }

      // 2. Author Filter
      const matchAuthor = selectedAuthors.length === 0 || selectedAuthors.includes(book.author);
      if (!matchAuthor) return false;
      
      // 3. Search Filter
      if (activeSearch === '') return true;
      
      const searchLower = activeSearch.toLowerCase();
      const titleLower = book.title.toLowerCase();
      const authorLower = book.author.toLowerCase();

      if (searchMode === 'contains') {
        return titleLower.includes(searchLower) || authorLower.includes(searchLower);
      } else {
        return titleLower.startsWith(searchLower) || authorLower.startsWith(searchLower);
      }
    });

    result.sort((a, b) => {
      let compare = 0;
      if (sortBy === 'author') {
        compare = a.author.localeCompare(b.author);
        if (compare === 0) {
           return a.title.localeCompare(b.title);
        }
      } else {
        compare = a.title.localeCompare(b.title);
      }
      return sortDirection === 'asc' ? compare : -compare;
    });

    return result;
  }, [data.books, activeSearch, selectedAuthors, sortBy, sortDirection, searchMode, showOnlyUserData, bookNotes]);

  // --- HANDLERS ---
  const performHeavyAction = (action: () => void) => {
      setIsBusy(true);
      requestAnimationFrame(() => {
          setTimeout(() => {
              try {
                  action(); 
              } catch (e) {
                  console.error("Errore azione:", e);
              } finally {
                  setIsBusy(false);
              }
          }, 100); 
      });
  };

  // AUTO-RESET FILTER HANDLERS
  const resetUserDataFilter = () => {
      if (showOnlyUserData) setShowOnlyUserData(false);
  };

  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
    if (searchMode === 'contains') {
        resetUserDataFilter(); // Reset filter
        setActiveSearch(term);
        setSelectedBook(null);
    }
  };

  const handleManualSearch = () => {
    performHeavyAction(() => {
        resetUserDataFilter(); // Reset filter
        setActiveSearch(searchTerm);
        setSelectedBook(null);
    });
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    performHeavyAction(() => {
        setSearchMode(mode);
        resetUserDataFilter();
        setSelectedBook(null);
    });
  };

  const handleSortChange = (newSortBy: SortOption) => {
    performHeavyAction(() => {
        resetUserDataFilter(); // Reset filter
        if (sortBy === newSortBy) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortDirection('asc');
        }
    });
  };

  const handleToggleAuthor = (author: string) => {
      performHeavyAction(() => {
          resetUserDataFilter(); // Reset filter
          setSelectedAuthors(prev => {
              if (prev.includes(author)) {
                  return prev.filter(a => a !== author);
              } else {
                  return [...prev, author];
              }
          });
      });
  };

  const handleResetAuthors = () => {
      performHeavyAction(() => {
          resetUserDataFilter(); // Reset filter
          setSelectedAuthors([]);
      });
  };

  const handleToggleUserDataFilter = () => {
      performHeavyAction(() => {
          setShowOnlyUserData(prev => !prev);
      });
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
  };

  useEffect(() => {
      if (selectedBook) {
        const exists = filteredBooks.find(b => b.id === selectedBook.id);
        if (!exists) setSelectedBook(null);
      }
  }, [filteredBooks]); 

  return (
    <div className="h-screen w-full flex flex-col max-w-md mx-auto overflow-hidden relative font-sans">
      
      {/* OVERLAY DI BLOCCO */}
      {isBusy && (
          <div className="fixed inset-0 z-[100] cursor-wait bg-transparent" />
      )}

      {/* BACKGROUND IMAGE */}
      <div 
        className="absolute inset-0 z-0"
        style={{ 
            backgroundImage: `url('${BACKGROUND_IMAGE_URL}')`, 
            opacity: 1, 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      <div className="z-10 flex flex-col h-full w-full">
        <Header 
          metadata={data.metadata} 
          filteredCount={filteredBooks.length} 
          totalCount={data.books.length}
          onRefreshData={refreshAppData}
          onSettingsSaved={handleSettingsSaved}
          isBusy={isBusy}
          uiOpacity={uiOpacity}
        />

        <SearchBlock 
          searchTerm={searchTerm} 
          setSearchTerm={handleSearchTermChange} 
          onSearch={handleManualSearch}
          searchMode={searchMode}
          setSearchMode={handleSearchModeChange}
          isBusy={isBusy}
          uiOpacity={uiOpacity}
          // Sort Props
          sortBy={sortBy}
          setSortBy={handleSortChange}
          sortDirection={sortDirection}
        />

        <AuthorComboBlock 
          authors={uniqueAuthors} 
          selectedAuthors={selectedAuthors} 
          toggleAuthor={handleToggleAuthor}
          resetAuthors={handleResetAuthors}
          // User Filter Props
          showOnlyUserData={showOnlyUserData}
          toggleShowOnlyUserData={handleToggleUserDataFilter}
          // Sort
          sortBy={sortBy}
          sortDirection={sortDirection}
          isBusy={isBusy}
          uiOpacity={uiOpacity}
        />

        {/* 
            MODIFICA LAYOUT:
            flex-1: Occupa tutto lo spazio verticale rimanente.
            min-h-0: Necessario per far funzionare lo scroll interno in flexbox nidificati.
        */}
        <div className="flex-1 w-full min-h-0 relative">
            <BookListBlock 
            books={filteredBooks} 
            onSelectBook={handleSelectBook} 
            selectedBookId={selectedBook?.id}
            sortBy={sortBy}
            sortDirection={sortDirection}
            uiOpacity={uiOpacity}
            bookNotes={bookNotes} // Passiamo le note
            isLoading={isAppLoading} // Nuovo stato loading
            />
        </div>

        {/* Pannello Dettaglio */}
        <DetailBlock 
            book={selectedBook}
            uiOpacity={uiOpacity}
            bookNotes={bookNotes} // Passiamo le note
            onRequestStatusChange={requestStatusChange}
            onRequestNoteEdit={requestNoteEdit}
            onRateBook={handleRateBook}
        />
      </div>

      {/* --- MODALI (LIVELLO APP) --- */}
      
      {/* Modale Conferma Stato */}
      <StatusModal 
        state={statusModal}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        onConfirm={handleStatusConfirm}
      />

      {/* Modale Note */}
      <NoteModal
        isOpen={noteModal.isOpen}
        book={noteModal.book}
        initialNote={noteModal.initialText}
        onClose={() => setNoteModal({ ...noteModal, isOpen: false })}
        onSave={handleNoteSave}
      />
    </div>
  );
};

export default App;