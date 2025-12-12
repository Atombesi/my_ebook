import React, { useState, useEffect } from 'react';
import { X, Save, Link as LinkIcon, FolderOpen, Terminal, ChevronRight, ChevronDown, Sliders, Bug, Trash2 } from 'lucide-react';
import { loadSettings, saveSettings } from '../services/csvService';
import { getLogs, clearLogs } from '../services/syncService';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hideLogs?: boolean;
  onSave?: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, hideLogs = false, onSave }) => {
  const [folderUrl, setFolderUrl] = useState('');
  const [uiOpacity, setUiOpacity] = useState(0.3);
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Stati di visibilità per le sezioni
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showVisuals, setShowVisuals] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const settings = loadSettings();
      setFolderUrl(settings.folderUrl || '');
      setUiOpacity(settings.uiOpacity !== undefined ? settings.uiOpacity : 0.3);
      setDebugMode(settings.debugMode || false);

      // Se è il primo avvio (hideLogs true), mostriamo l'input URL per forza
      if (hideLogs) {
          setShowUrlInput(true);
      } else {
          setLogs(getLogs());
      }
    }
  }, [isOpen, hideLogs]);

  const handleSave = () => {
    const cleanUrl = folderUrl.trim();
    const newSettings: AppSettings = { 
        folderUrl: cleanUrl,
        uiOpacity,
        debugMode
    };
    
    saveSettings(newSettings);
    
    if (onSave) onSave(newSettings);
    onClose();
  };

  const handleClearLogs = (e: React.MouseEvent) => {
      e.stopPropagation();
      clearLogs();
      setLogs([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-emerald-500" />
            Configurazione
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* Sezione Visibilità */}
          <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowVisuals(!showVisuals)}
                className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"
              >
                  <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      Aspetto & Sistema
                  </div>
                  {showVisuals ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {showVisuals && (
                <div className="space-y-4 p-3 bg-slate-950/30 rounded border border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
                     {/* Opacity Slider */}
                     <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Opacità Pannelli</span>
                            <span className="font-mono text-emerald-400">{(uiOpacity * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.05"
                            value={uiOpacity} 
                            onChange={(e) => setUiOpacity(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>
                </div>
              )}
          </div>

          {/* Sezione Toggle Link Dropbox */}
          <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"
              >
                  <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                      <FolderOpen className="w-4 h-4 text-emerald-400" />
                      Imposta Cartella Dropbox
                  </div>
                  {showUrlInput ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {showUrlInput && (
                <div className="space-y-2 p-2 bg-slate-950/30 rounded border border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-slate-400">
                        Incolla qui il <b>Link condiviso</b> della cartella:
                    </p>
                    <textarea 
                    value={folderUrl}
                    onChange={(e) => setFolderUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none font-mono h-20 resize-none"
                    placeholder="https://www.dropbox.com/scl/fo/..."
                    />
                </div>
              )}
          </div>

          {/* Sezione Toggle Logs */}
          {!hideLogs && (
            <div className="flex flex-col gap-2">
                <button 
                    onClick={() => setShowConsole(!showConsole)}
                    className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"
                >
                    <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                        <Terminal className="w-4 h-4 text-orange-400" />
                        Log Sistema (Eventi & Errori)
                    </div>
                    {showConsole ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {showConsole && (
                    <div className="relative animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-2">
                        {/* Console Box */}
                        <div className="w-full bg-black border border-slate-800 rounded p-2 text-[10px] text-green-400 font-mono h-40 overflow-y-auto shadow-inner">
                            {logs.length === 0 ? (
                                <span className="text-slate-600">Nessun log presente...</span>
                            ) : (
                                logs.map((log, idx) => (
                                    <div key={idx} className="mb-1 border-b border-slate-900 pb-0.5 last:border-0 break-all">
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Strumenti Console (Sotto il testo) */}
                        <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded border border-slate-800">
                            {/* Debug Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={debugMode}
                                        onChange={(e) => setDebugMode(e.target.checked)}
                                    />
                                    <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-900/80"></div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Bug className={`w-3 h-3 ${debugMode ? 'text-red-400' : 'text-slate-500'}`} />
                                    <span>Debug</span>
                                </div>
                            </label>

                            {/* Clear Button */}
                            <button 
                                onClick={handleClearLogs}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-200 rounded transition-colors text-xs border border-slate-700"
                            >
                                <Trash2 className="w-3 h-3" />
                                <span>Pulisci</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            Salva
          </button>
        </div>
      </div>
    </div>
  );
};