import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface ShareModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const roomUrl = `${window.location.origin}?room=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'მაფიის სათამაშო ოთახი',
        text: `შემოგვიერთდი მაფიის თამაშში! ოთახის კოდი: ${roomCode}`,
        url: roomUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-white mb-1 font-serif-title">მოთამაშეების მოწვევა</h3>
          <p className="text-xs text-slate-400">დაასკანერეთ QR კოდი ან გაუგზავნეთ ლინკი მეგობრებს</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6 p-4 bg-white rounded-2xl shadow-inner max-w-[210px] mx-auto">
          <QRCodeSVG value={roomUrl} size={180} level="M" />
        </div>

        {/* Room Code Display */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 text-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 block mb-0.5">ოთახის კოდი</span>
          <span className="text-2xl font-mono font-bold tracking-widest text-rose-400">{roomCode}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 rounded-xl transition-all btn-press shadow-lg shadow-rose-900/30"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'ლინკი დაკოპირდა!' : 'ლინკის კოპირება'}</span>
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 rounded-xl border border-slate-700 transition-all btn-press"
            >
              <Share2 className="w-4 h-4" />
              <span>გაზიარება (Share)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
