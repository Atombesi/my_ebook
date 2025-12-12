import React, { useState, useEffect } from 'react';
import { IndexMetadata, AppSettings } from '../types';
import { BookOpen, DownloadCloud, Settings, Loader2, AlertTriangle, CheckCircle2, ArrowDownToLine, Server, FileArchive } from 'lucide-react';
import { checkForUpdatesAndDownload, applyUpdate, addLog } from '../services/syncService';
import { SettingsModal } from './SettingsModal';
import { loadSettings } from '../services/csvService';

interface HeaderProps {
  metadata: IndexMetadata | null;
  filteredCount: number;
  totalCount: number;
  onRefreshData: () => void;
  onSettingsSaved: (settings: AppSettings) => void;
  isBusy: boolean;
  uiOpacity: number;
}

interface UpdateState {
    isOpen: boolean;
    date: string;
    content: string;
}

export const Header: React.FC<HeaderProps> = ({ metadata, filteredCount, totalCount, onRefreshData, onSettingsSaved, isBusy, uiOpacity }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false); 
  const [confirmModal, setConfirmModal] = useState<UpdateState>({ isOpen: false, date: '', content: '' });
  
  // Nuovo stato per il testo di progresso (se presente, mostra il modale loading)
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  const isTestMode = metadata?.label?.trim() === 'TEST';

  useEffect(() => {
    const settings = loadSettings();
    if (!settings.folderUrl || settings.folderUrl.trim() === '') {
        setIsOnboarding(true);
        setShowSettings(true);
    }
  }, []);

  const handleUpdateFlow = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateError(false);
    setProgressStatus("Inizializzazione connessione...");
    
    try {
        const currentDate = metadata?.creationDate || "01-01-2000 00:00";
        
        // Passiamo la callback per aggiornare lo stato visivo
        const result = await checkForUpdatesAndDownload(currentDate, (status) => {
            setProgressStatus(status);
        });

        // Delay minimo per far leggere l'ultimo messaggio all'utente
        await new Promise(r => setTimeout(r, 500));
        setProgressStatus(null); // Chiude il modale di caricamento

        if (result.error === 'MISSING_URL') {
            setIsUpdating(false);
            setIsOnboarding(false);
            setShowSettings(true);
            return;
        }

        if (result.error) {
            setUpdateError(true);
            setIsUpdating(false);
            setIsOnboarding(false);
            setShowSettings(true);
            return;
        }

        if (!result.hasUpdate) {
            setIsUpdating(false);
            alert("Nessun aggiornamento trovato.");
            return;
        }

        if (result.hasUpdate && result.pendingContent && result.remoteDateStr) {
            setConfirmModal({
                isOpen: true,
                date: result.remoteDateStr,
                content: result.pendingContent
            });
            setIsUpdating(false);
        }

    } catch (e: any) {
        setProgressStatus(null);
        setIsUpdating(false);
        setUpdateError(true);
        addLog(`CRITICAL UI ERROR: ${e.message}`);
    }
  };

  const executeUpdate = () => {
      try {
          applyUpdate(confirmModal.content);
          onRefreshData();
          setConfirmModal({ isOpen: false, date: '', content: '' });
      } catch (e) {
          addLog("Errore salvataggio: " + e);
      }
  };

  const handleSettingsSave = (settings: AppSettings) => {
      onSettingsSaved(settings);
      if (isOnboarding) {
          setIsOnboarding(false); 
          setTimeout(() => {
              handleUpdateFlow();
          }, 300);
      }
  };

  // Se Busy -> Sfondo Giallo (override trasparenza). Altrimenti -> Trasparenza Utente.
  const bgStyle = isBusy 
    ? { backgroundColor: 'rgb(234, 179, 8)' } // yellow-500
    : { backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` };

  return (
    <>
      <div 
        className="h-[10%] w-full flex flex-col justify-center px-4 relative overflow-hidden z-30 transition-colors duration-200 ease-in-out"
        style={bgStyle}
      >
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400 drop-shadow-md" />
            <h1 className="text-xl font-bold tracking-wide text-white drop-shadow-md">MY_Ebook</h1>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                  onClick={() => {
                      setIsOnboarding(false);
                      setShowSettings(true);
                  }}
                  className="p-1.5 rounded-full bg-slate-800/40 text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                  <Settings className="w-4 h-4" />
              </button>

              <button 
                  onClick={handleUpdateFlow}
                  disabled={isUpdating}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-sm
                    ${updateError 
                        ? 'bg-red-900/50 text-red-200' 
                        : isUpdating 
                            ? 'bg-slate-800/60 text-emerald-400 cursor-wait' 
                            : 'bg-slate-800/40 text-slate-300 hover:text-emerald-400'
                    }
                  `}
              >
                  {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-medium">Loading...</span>
                      </>
                  ) : updateError ? (
                       <>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">Errore</span>
                      </>
                  ) : (
                      <>
                        <DownloadCloud className="w-4 h-4" />
                        <span className="text-xs font-medium hidden sm:inline">Aggiorna</span>
                      </>
                  )}
              </button>
          </div>
        </div>
        
        {/* Riga inferiore */}
        <div className="mt-1 z-10 flex items-center justify-between">
          {metadata && (
            isTestMode ? (
              <div className="text-red-500 font-bold tracking-wider animate-pulse text-sm drop-shadow-md">
                NO INDEX
              </div>
            ) : (
              <div className="text-slate-300 text-xs flex items-center gap-1 drop-shadow-md">
                <span className="opacity-80">Data:</span>
                <span className="font-mono text-white">{metadata.creationDate}</span>
              </div>
            )
          )}
          
          <div className="text-xs flex items-center gap-1 drop-shadow-md">
                 <span className="text-white font-semibold">{filteredCount}</span>
                 <span className="text-slate-500">/</span>
                 <span className="text-green-500 font-semibold">{totalCount}</span>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        hideLogs={isOnboarding}
        onSave={handleSettingsSave}
      />

      {/* --- PROGRESS MODAL (NEW) --- */}
      {progressStatus && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
              <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                  <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                      <Loader2 className="w-16 h-16 text-emerald-400 animate-spin relative z-10" />
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                      <h3 className="text-xl font-bold text-white tracking-wide">Download in corso</h3>
                      <p className="text-slate-400 text-sm text-center max-w-[200px] animate-pulse">
                          Non chiudere l'applicazione...
                      </p>
                  </div>

                  {/* Visual Status Indicator */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 w-full min-w-[250px] flex flex-col gap-3">
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                          {progressStatus.includes('Connessione') ? <Server className="w-4 h-4 text-yellow-400 animate-pulse" /> : <Server className="w-4 h-4 text-slate-500" />}
                          {progressStatus.includes('Scaricamento') ? <ArrowDownToLine className="w-4 h-4 text-blue-400 animate-bounce" /> : <ArrowDownToLine className="w-4 h-4 text-slate-500" />}
                          {progressStatus.includes('ZIP') ? <FileArchive className="w-4 h-4 text-purple-400 animate-pulse" /> : <FileArchive className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div className="h-px w-full bg-slate-700"></div>
                      <span className="text-xs font-mono text-emerald-300 text-center">
                          {progressStatus}
                      </span>
                  </div>
              </div>
          </div>
      )}

      {/* --- CONFIRM UPDATE MODAL --- */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-5 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center mb-3 ring-1 ring-emerald-500/50">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">Nuovo Indice Trovato!</h3>
                      <p className="text-slate-400 text-sm mb-4">
                          È disponibile una versione aggiornata.
                      </p>
                      
                      <div className="bg-slate-950 rounded p-3 border border-slate-800 w-full mb-6">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Data Rilascio</div>
                          <div className="text-lg font-mono text-emerald-400">{confirmModal.date}</div>
                      </div>

                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setConfirmModal({isOpen: false, date:'', content:''})}
                              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
                          >
                              Annulla
                          </button>
                          <button 
                              onClick={executeUpdate}
                              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                          >
                              Scarica Ora
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};