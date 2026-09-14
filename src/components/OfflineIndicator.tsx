import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/95 px-3.5 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md border border-amber-400/40 animate-pulse"
    >
      <WifiOff className="w-4 h-4 text-amber-200" />
      <span>Çevrimdışı Mod — Önbelleğe alınan veriler kullanılıyor.</span>
    </div>
  );
};
