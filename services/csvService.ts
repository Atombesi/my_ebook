import { Book, AppData, IndexMetadata, AppSettings, BookNotes, BookNoteEntry, BookStatus } from '../types';
import { 
  DEFAULT_CSV_CONTENT, 
  STORAGE_KEY_INDEX, 
  STORAGE_KEY_NOTE, 
  STORAGE_KEY_CONFIG, 
  CSV_SEPARATOR,
  DEFAULT_DROPBOX_FOLDER_URL
} from '../constants';

// Simple UUID generator for React keys
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const initializeFileSystem = (): void => {
  const existingIndex = localStorage.getItem(STORAGE_KEY_INDEX);
  
  if (!existingIndex) {
    console.log('Initializing My_Ebook environment...');
    localStorage.setItem(STORAGE_KEY_INDEX, DEFAULT_CSV_CONTENT);
    localStorage.setItem(STORAGE_KEY_NOTE, '{}'); // Init empty JSON object
  }
};

export const saveRawIndex = (content: string): void => {
  localStorage.setItem(STORAGE_KEY_INDEX, content);
};

// --- SETTINGS MANAGEMENT ---
export const loadSettings = (): AppSettings => {
  const rawConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
  let settings: AppSettings = {
    folderUrl: DEFAULT_DROPBOX_FOLDER_URL,
    uiOpacity: 0.3,
    debugMode: false
  };

  if (rawConfig) {
    try {
        const parsed = JSON.parse(rawConfig);
        settings = {
            folderUrl: parsed.folderUrl !== undefined ? parsed.folderUrl : DEFAULT_DROPBOX_FOLDER_URL,
            uiOpacity: parsed.uiOpacity !== undefined ? parsed.uiOpacity : 0.3,
            debugMode: parsed.debugMode !== undefined ? parsed.debugMode : false
        };
    } catch (e) {
        console.error("Error loading settings", e);
    }
  }
  return settings;
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(settings));
};

// --- NOTES / STATUS MANAGEMENT ---

// Helper per generare la chiave univoca
export const getBookKey = (book: Book): string => {
    return `${book.author}|${book.title}`;
};

export const loadNotes = (): BookNotes => {
    const raw = localStorage.getItem(STORAGE_KEY_NOTE);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        const normalized: BookNotes = {};
        
        // Data Migration: String -> Object
        Object.keys(parsed).forEach(key => {
            const val = parsed[key];
            if (typeof val === 'string') {
                // Vecchio formato: solo stato
                normalized[key] = { status: val as BookStatus };
            } else {
                // Nuovo formato: oggetto completo
                normalized[key] = val;
            }
        });
        
        return normalized;
    } catch (e) {
        console.error("Error parsing notes", e);
        return {};
    }
};

export const saveNotes = (notes: BookNotes): void => {
    localStorage.setItem(STORAGE_KEY_NOTE, JSON.stringify(notes));
};

// --- DATA LOADING ---
export const loadData = (): AppData => {
  const rawContent = localStorage.getItem(STORAGE_KEY_INDEX);

  if (!rawContent) {
    return { metadata: null, books: [] };
  }

  const lines = rawContent.split('\n').filter(line => line.trim() !== '');

  let metadata: IndexMetadata | null = null;
  let startIndex = 0;

  if (lines.length > 0) {
    const firstLine = lines[0];
    const metaParts = firstLine.split(CSV_SEPARATOR);
    
    if (metaParts.length >= 2) {
      metadata = {
        label: metaParts[0].trim(),
        creationDate: metaParts[1].trim()
      };
      startIndex = 1;
    }
  }

  const books: Book[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(CSV_SEPARATOR);
    
    // FORMATO ATTESO: Autore;Titolo;Formato
    if (parts.length >= 3) {
      const author = parts[0].trim();
      const title = parts[1].trim();
      const format = parts[2].trim();

      // VALIDAZIONE: Scarta se autore o titolo sono vuoti
      if (author && title) {
          books.push({
            id: generateId(),
            author: author,
            title: title,
            format: format
          });
      }
    }
  }

  return { metadata, books };
};