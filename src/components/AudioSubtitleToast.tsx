import React, { useState, useEffect } from 'react';
import { audioManager } from '../lib/audioManager';
import { Volume2, Sparkles } from 'lucide-react';

export const AudioSubtitleToast: React.FC = () => {
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    audioManager.setSubtitleCallback((text: string) => {
      setSubtitle(text);
      setVisible(true);

      const timeout = setTimeout(() => {
        setVisible(false);
      }, Math.max(3500, text.length * 90));

      return () => clearTimeout(timeout);
    });
  }, []);

  if (!visible || !subtitle) return null;

  return (
    <div className="fixed top-[calc(max(env(safe-area-inset-top,0px),12px)+3.5rem)] left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md w-full px-2 pointer-events-none animate-slide-up">
      <div className="bg-slate-900/95 border border-rose-500/40 shadow-2xl shadow-rose-950/50 rounded-2xl px-4 py-3 text-center flex items-center justify-center gap-2.5 backdrop-blur-lg">
        <div className="p-1.5 rounded-full bg-rose-600/20 text-rose-400 shrink-0 animate-pulse">
          <Volume2 className="w-4 h-4" />
        </div>
        <p className="text-sm sm:text-base font-medium text-rose-100 italic tracking-wide">
          "{subtitle}"
        </p>
      </div>
    </div>
  );
};
