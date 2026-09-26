import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (code: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
}

export function useBarcodeScanner({
  onScan,
  minChars = 6,
  maxIntervalMs = 70
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Check if user is actively focusing an input other than the quick code input
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      const now = performance.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const scannedCode = bufferRef.current.trim();
        if (scannedCode.length >= minChars) {
          e.preventDefault();
          onScan(scannedCode);
        }
        bufferRef.current = '';
        return;
      }

      // Printable single characters
      if (e.key.length === 1) {
        // If speed is fast (like barcode scanner) or buffer was just started
        if (timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
          // Too slow between keystrokes -> reset buffer (manual slow typing)
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, minChars, maxIntervalMs]);
}
