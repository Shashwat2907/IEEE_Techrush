import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { compressToEncodedURIComponent } from 'lz-string';
import { CloseIcon } from './Icons';

export default function TripShareModal({ isOpen, onClose, itinerary, isDark }) {
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => {
    if (!isOpen || !itinerary) return '';
    const payload = compressToEncodedURIComponent(JSON.stringify(itinerary));
    return `${window.location.origin}${window.location.pathname}?trip=${payload}`;
  }, [isOpen, itinerary]);

  useEffect(() => {
    let active = true;
    if (!shareUrl) return undefined;
    QRCode.toDataURL(shareUrl, { width: 300, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#09090B', light: '#FFFFFF' } })
      .then((url) => active && setQrUrl(url))
      .catch(() => active && setQrUrl(''));
    return () => { active = false; };
  }, [shareUrl]);

  if (!isOpen) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center p-4 bg-black/75 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full max-w-sm rounded-[28px] apple-liquid-glass p-5 shadow-2xl ${isDark ? 'text-white border-white/15' : 'text-slate-900 border-black/10'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Magic QR handoff</p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Scan on mobile to copy this itinerary into local TripNest state.</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"><CloseIcon className="w-4 h-4" /></button>
        </div>
        <div className="mt-5 bg-white rounded-2xl p-3 aspect-square grid place-items-center">
          {qrUrl ? <img src={qrUrl} alt="QR code for this TripNest itinerary" className="w-full h-full object-contain" /> : <span className="text-xs text-slate-500">Preparing QR…</span>}
        </div>
        <button type="button" onClick={copy} className="mt-4 w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors">
          {copied ? 'Link copied' : 'Copy handoff link'}
        </button>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-zinc-400">No account or server required. The link contains a compressed copy of this trip.</p>
      </div>
    </div>
  );
}
