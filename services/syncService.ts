import JSZip from 'jszip';
import { saveRawIndex, loadSettings } from './csvService';
import { FILE_NAME_DATA, FILE_NAME_INDEX, STORAGE_KEY_LOGS } from '../constants';

// --- SYSTEM LOGGING ---
let storedLogs: string[] = [];
try {
    const saved = localStorage.getItem(STORAGE_KEY_LOGS);
    if (saved) {
        storedLogs = JSON.parse(saved);
    }
} catch (e) {
    console.error("Error loading logs", e);
}

export let debugLogs: string[] = storedLogs;

export const addLog = (msg: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${msg}`;
  
  console.log(logEntry);
  
  debugLogs.unshift(logEntry);
  if (debugLogs.length > 100) debugLogs = debugLogs.slice(0, 100); // Aumentato limite buffer
  
  try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(debugLogs));
  } catch (e) {
      console.error("Error saving logs", e);
  }
};

export const clearLogs = () => {
    debugLogs = [];
    localStorage.removeItem(STORAGE_KEY_LOGS);
    addLog("Log azzerati dall'utente.");
};

export const getLogs = () => debugLogs;

// Helper date
const parseCustomDate = (dateStr: string): Date | null => {
  try {
    if (!dateStr) return null;
    
    // NORMALIZZAZIONE: Sostituisce eventuali slash con trattini e pulisce spazi
    // Esempio: "12/12/2025 10:00" -> "12-12-2025 10:00"
    const normalized = dateStr.replace(/\//g, '-').trim();
    
    const [d, t] = normalized.split(' ');
    if (!d || !t) return null;

    const [day, month, year] = d.split('-').map(Number);
    const [hour, minute] = t.split(':').map(Number);
    
    // Controllo validità numerica
    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) {
        return null;
    }

    return new Date(year, month - 1, day, hour, minute);
  } catch (e) {
    return null;
  }
};

export interface SyncResult {
  hasUpdate: boolean;
  remoteDateStr?: string;
  error?: string;
  pendingContent?: string;
}

// Proxy fetcher
async function fetchBlobViaProxy(
    targetUrl: string, 
    proxyService: 'corsproxy' | 'allorigins',
    onStatusUpdate?: (status: string) => void
): Promise<Blob> {
    
    let downloadUrl = targetUrl;
    
    if (downloadUrl.includes('dl=0')) {
        downloadUrl = downloadUrl.replace('dl=0', 'dl=1');
    } else if (!downloadUrl.includes('dl=1')) {
         const separator = downloadUrl.includes('?') ? '&' : '?';
         downloadUrl = `${downloadUrl}${separator}dl=1`;
    }

    const uniqueUrl = `${downloadUrl}&ts=${Date.now()}`;
    let finalUrl = '';
    
    if (proxyService === 'corsproxy') {
        finalUrl = "https://corsproxy.io/?" + encodeURIComponent(uniqueUrl);
    } else {
        finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(uniqueUrl)}`;
    }

    if (onStatusUpdate) onStatusUpdate(`Connessione (${proxyService})...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); 

    try {
        const response = await fetch(finalUrl, { 
            cache: "no-store", 
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        if (onStatusUpdate) onStatusUpdate("Ricezione pacchetto dati...");
        const blob = await response.blob();
        
        if (blob.size < 100) throw new Error("File scaricato troppo piccolo o non valido.");
        
        return blob;
    } catch (e: any) {
        clearTimeout(timeoutId);
        throw e;
    }
}

export const checkForUpdatesAndDownload = async (
    currentDateStr: string,
    onStatusUpdate?: (status: string) => void
): Promise<SyncResult> => {
    
    const settings = loadSettings();
    const isDebug = settings.debugMode || false;

    if (!settings.folderUrl) {
        return { hasUpdate: false, error: 'MISSING_URL' };
    }

    if (isDebug) addLog(`[DEBUG] Start Update. Local Date String: "${currentDateStr}"`);
    if (onStatusUpdate) onStatusUpdate("Inizializzazione...");

    try {
        // DOWNLOAD
        let blob: Blob;
        try {
            blob = await fetchBlobViaProxy(settings.folderUrl, 'corsproxy', onStatusUpdate);
        } catch (e) {
            if (isDebug) addLog(`[DEBUG] Proxy 1 fallito: ${e}`);
            if (onStatusUpdate) onStatusUpdate("Primo server occupato. Riprovo...");
            await new Promise(r => setTimeout(r, 1000));
            blob = await fetchBlobViaProxy(settings.folderUrl, 'allorigins', onStatusUpdate);
        }

        if (isDebug) addLog(`[DEBUG] Blob ricevuto. Size: ${blob.size} bytes. Type: ${blob.type}`);
        
        if (onStatusUpdate) onStatusUpdate("Apertura archivio ZIP...");
        const zip = await JSZip.loadAsync(blob);
        
        // CERCA FILE
        const fileDataKey = Object.keys(zip.files).find(name => name.includes("Ebook_Index") || name.endsWith(".csv"));
        
        if (!fileDataKey) {
            if (isDebug) addLog(`[DEBUG] ZIP content keys: ${Object.keys(zip.files).join(", ")}`);
            throw new Error(`File 'Ebook_Index' non trovato nello ZIP.`);
        }

        // LOG DATE ZIP
        if (isDebug) {
            const zipDate = zip.files[fileDataKey].date;
            addLog(`[DEBUG] ZIP Entry Date: ${zipDate}`);
        }

        if (onStatusUpdate) onStatusUpdate("Analisi contenuto...");
        const content = await zip.file(fileDataKey)?.async("string");
        if (!content) throw new Error("Impossibile leggere il contenuto del file.");

        // ANALISI HEADER
        const lines = content.split('\n');
        const firstLine = lines[0];
        
        if (isDebug) addLog(`[DEBUG] Header Letto (Raw): "${firstLine}"`);

        const parts = firstLine.split(';');
        if (parts.length < 2) {
            throw new Error("Formato file indice non valido (manca header data).");
        }

        const remoteDateStr = parts[1].trim();
        const remoteDate = parseCustomDate(remoteDateStr);
        const currentDate = parseCustomDate(currentDateStr);

        if (!remoteDate) throw new Error(`Data remota non valida: "${remoteDateStr}"`);

        if (isDebug) {
             // Mostriamo come sono state interpretate le date
             const localParsed = currentDate ? currentDate.toLocaleString() : "FAIL/NULL";
             const remoteParsed = remoteDate.toLocaleString();
             addLog(`[DEBUG] Interpreted: Local[${localParsed}] vs Remote[${remoteParsed}]`);
             
             if (currentDate) {
                addLog(`[DEBUG] Check Math: ${remoteDate.getTime()} > ${currentDate.getTime()} ? ${remoteDate > currentDate}`);
             } else {
                 addLog(`[DEBUG] Check: Local date is null/invalid, forcing update.`);
             }
        }

        // LOGICA CONFRONTO
        // Se currentDate è null (es. prima installazione o errore parsing precedente), aggiorniamo.
        if (!currentDate || remoteDate > currentDate) {
            if (isDebug) addLog("[DEBUG] Update Trovato! Procedo.");
            if (onStatusUpdate) onStatusUpdate("Aggiornamento valido trovato.");
            return {
                hasUpdate: true,
                remoteDateStr: remoteDateStr,
                pendingContent: content
            };
        } else {
            if (isDebug) addLog("[DEBUG] Update NON necessario (Indice già aggiornato).");
            if (onStatusUpdate) onStatusUpdate("Indice già aggiornato.");
            return { hasUpdate: false };
        }

    } catch (error: any) {
        console.error("[Sync Error]", error);
        addLog(`Errore Critical: ${error.message}`);
        return { hasUpdate: false, error: error.message };
    }
};

export const applyUpdate = (content: string) => {
    try {
        saveRawIndex(content);
        const lines = content.split('\n');
        const dateStr = lines[0].split(';')[1] || '???';
        addLog(`Aggiornamento completato. Nuova versione salvata: ${dateStr}`);
    } catch (e: any) {
        addLog(`Errore durante il salvataggio dati: ${e.message}`);
        throw e;
    }
};