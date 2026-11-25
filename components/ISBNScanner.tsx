import { CapacitorHttp } from '@capacitor/core';
import React, { useEffect, useRef, useState } from 'react';
import {
  BarcodeScanner,
  BarcodeFormat
} from '@capacitor-mlkit/barcode-scanning';
import { X, ScanBarcode } from 'lucide-react';

interface ISBNScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBookScanned?: (author: string, title: string) => void;
getBookStatus?: (author: string, title: string) => 'ABSENT' | 'PRESENT' | 'PAPERBACK' | 'SIMILAR';
}

interface LibroSBN {
  titolo: string;
  autorePrincipale: string;
  pubblicazione: string;
  copertina: string;
}

interface RispostaSBN {
  numFound: number;
  briefRecords?: LibroSBN[];
}

export const ISBNScanner: React.FC<ISBNScannerProps> = ({
  isOpen,
  onClose,
  onBookScanned,
  getBookStatus
}) => {
  const [isbn, setIsbn] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [ricerca, setRicerca] = useState(false);
  const [libro, setLibro] = useState<LibroSBN | null>(null);
  const [copertinaErrore, setCopertinaErrore] = useState(false);
  const avviato = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      avviato.current = false;
      return;
    }

    if (avviato.current) return;
    avviato.current = true;

    let cancelled = false;
    const controller = new AbortController();

    const cercaLibro = async (codiceISBN: string) => {
      setRicerca(true);
      setLibro(null);
      setCopertinaErrore(false);

      try {
        const url =
          'https://opac.sbn.it/opacmobilegw/search.json?isbn=' +
          encodeURIComponent(codiceISBN);

      const risposta = await CapacitorHttp.get({
  url: url,
  headers: {
    Accept: 'application/json'
  }
});

if (risposta.status !== 200) {
  throw new Error(
    'Errore HTTP durante la ricerca SBN: ' +
    risposta.status
  );
}

const dati: RispostaSBN =
  typeof risposta.data === 'string'
    ? JSON.parse(risposta.data)
    : risposta.data;

        if (cancelled) return;

        if (dati.numFound > 0 &&
            dati.briefRecords &&
            dati.briefRecords.length > 0) {
          setLibro(dati.briefRecords[0]);
        } else {
          setError('Libro non trovato nel catalogo SBN.');
        }

      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? 'Ricerca SBN: ' + e.message
              : 'Errore durante la ricerca SBN.'
          );
        }
      } finally {
        if (!cancelled) {
          setRicerca(false);
        }
      }
    };

    const avviaScanner = async () => {
      setIsbn('');
      setError('');
      setLibro(null);
      setScanning(true);

      try {
        const { supported } =
          await BarcodeScanner.isSupported();

        if (!supported) {
          throw new Error(
            'Scanner non supportato dal dispositivo.'
          );
        }

        const { available } =
          await BarcodeScanner
            .isGoogleBarcodeScannerModuleAvailable();

        if (!available) {
          await BarcodeScanner
            .installGoogleBarcodeScannerModule();

          throw new Error(
            'Installazione del modulo scanner Google avviata. ' +
            'Attendi il completamento e riapri lo scanner ISBN.'
          );
        }

        const risultato = await BarcodeScanner.scan({
          formats: [BarcodeFormat.Ean13],
          autoZoom: true
        });

       if (cancelled) return;

const codice = risultato.barcodes
  .map(b => b.rawValue || '')
  .find(value =>
    /^\d{13}$/.test(value) &&
    (value.startsWith('978') || value.startsWith('979'))
  );

if (codice) {
  setIsbn(codice);
  await cercaLibro(codice);
} else if (risultato.barcodes.length > 0) {
  setError(
    'Il codice rilevato non è un ISBN valido.'
  );
}

      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Errore durante la scansione.'
          );
        }
      } finally {
        if (!cancelled) {
          setScanning(false);
        }
      }
    };

    avviaScanner();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col text-white">

      <div className="flex items-center justify-between p-4 bg-slate-900">
        <div className="flex items-center gap-2">
          <ScanBarcode className="w-6 h-6 text-emerald-400" />
          <h2 className="text-lg font-bold">
            Scansione ISBN
          </h2>
        </div>

        <button onClick={onClose} title="Chiudi">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-5 overflow-y-auto">

        {scanning && (
          <p className="text-slate-300 text-center">
            Apertura scanner Android...
          </p>
        )}

        {isbn && (
          <p className="text-emerald-400 font-mono text-lg">
            ISBN: {isbn}
          </p>
        )}

        {ricerca && (
          <p className="text-slate-300 text-center">
            Ricerca del libro nel catalogo SBN...
          </p>
        )}

        {error && (
          <p className="text-red-400 text-center">
            {error}
          </p>
        )}

        {libro && (
          <div className="flex flex-col items-center gap-4 w-full max-w-md">

            {libro.copertina && !copertinaErrore && (
              <img
                src={libro.copertina.replace(
                  /^http:/,
                  'https:'
                )}
                alt="Copertina del libro"
                className="max-h-52 object-contain"
                onError={() => setCopertinaErrore(true)}
              />
            )}

            <h3 className="text-lg font-bold text-center">
              {libro.titolo}
            </h3>

            <p className="text-center">
              <span className="text-slate-400">
                Autore:
              </span>{' '}
              {libro.autorePrincipale}
            </p>

            <p className="text-center">
              <span className="text-slate-400">
                Pubblicazione:
              </span>{' '}
              {libro.pubblicazione}
            </p>

{getBookStatus && (() => {
  const stato = getBookStatus(
    libro.autorePrincipale || '',
    libro.titolo
  );

  if (stato === 'PAPERBACK') {
    return (
      <p className="text-green-400 font-bold text-center">
        ✓ Libro già presente e cartaceo
      </p>
    );
  }

if (stato === 'SIMILAR') {
  return (
    <p className="text-amber-400 font-bold text-center">
      ⚠ Possibile libro già presente nella libreria
    </p>
  );
}

  if (stato === 'PRESENT') {
    return (
      <p className="text-amber-400 font-bold text-center">
        Libro già presente, ma non cartaceo
      </p>
    );
  }

  return (
    <p className="text-sky-400 font-bold text-center">
      Libro non presente nella libreria
    </p>
  );
})()}


<button
  type="button"
  onClick={() => {
    if (onBookScanned) {
      onBookScanned(
        libro.autorePrincipale || '',
        libro.titolo
      );
      onClose();
    }
  }}
  className="w-full py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500"
>
 {getBookStatus?.(libro.autorePrincipale || '', libro.titolo) === 'SIMILAR'
    ? 'Verifica e aggiungi'
    : 'Aggiungi alla libreria'}
</button>

            <p className="text-slate-500 text-xs">
              Fonte: OPAC SBN
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="px-6 py-3 bg-slate-800 rounded-lg font-semibold"
        >
          Chiudi
        </button>

      </div>
    </div>
  );
};
