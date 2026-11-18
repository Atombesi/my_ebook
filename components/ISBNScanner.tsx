
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, Camera, ScanBarcode } from 'lucide-react';

interface ISBNScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ISBNScanner: React.FC<ISBNScannerProps> = ({
  isOpen,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isbn, setIsbn] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let stopScanner: (() => void) | undefined;

    setIsbn('');
    setError('');
    setScanning(true);

    const startScanner = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Fotocamera non disponibile.');
        }

        const reader = new BrowserMultiFormatReader();

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' }
            },
            audio: false
          },
          videoRef.current!,
          (result) => {
            if (cancelled || !result) return;

            const code = result.getText();

            if (
              /^\d{13}$/.test(code) &&
              (code.startsWith('978') || code.startsWith('979'))
            ) {
              setIsbn(code);
              setScanning(false);
              controls.stop();
            }
          }
        );

        stopScanner = () => controls.stop();

        if (cancelled) {
          controls.stop();
        }

      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Impossibile avviare la fotocamera.'
          );
          setScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col text-white">

      <div className="flex items-center justify-between p-4 bg-slate-900">
        <div className="flex items-center gap-2">
          <ScanBarcode className="w-6 h-6 text-emerald-400" />
          <h2 className="text-lg font-bold">Scansione ISBN</h2>
        </div>

        <button onClick={onClose} title="Chiudi">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-5">

        {!isbn && (
          <>
            <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                className="w-full aspect-[4/3] object-cover"
                autoPlay
                muted
                playsInline
              />

              <div className="absolute inset-0 border-2 border-emerald-400/50 pointer-events-none rounded-xl" />
            </div>

            {scanning && (
              <p className="text-slate-300 text-sm text-center">
                Inquadra il codice a barre ISBN del libro.
              </p>
            )}
          </>
        )}

        {error && (
          <div className="text-red-400 text-center">
            {error}
          </div>
        )}

        {isbn && (
          <div className="flex flex-col items-center gap-4">
            <Camera className="w-12 h-12 text-emerald-400" />

            <p className="text-emerald-400 font-bold">
              ISBN rilevato
            </p>

            <p className="text-2xl font-mono tracking-wider">
              {isbn}
            </p>

            <p className="text-slate-400 text-sm">
              Identificazione del volume non ancora attiva.
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
