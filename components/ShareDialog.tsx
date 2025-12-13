
import React, { useState } from 'react';
import { X, Copy, Share2, Check, QrCode, Smartphone, Link as LinkIcon } from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  accessCode: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, eventName, accessCode }) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  // Generate a direct link based on current location
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?code=${accessCode}`;
  const shareText = `Häng med på äventyret "${eventName}" i Quester! Använd kod: ${accessCode} eller klicka här: ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Gå med i ${eventName}`,
          text: `Jag utmanar dig att delta i ${eventName}! Kod: ${accessCode}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-b from-blue-900/20 to-transparent">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-gray-800/50 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/50 mb-4">
                <Share2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Bjud in Deltagare</h2>
            <p className="text-sm text-gray-400 mt-1 px-4">
                Dela koden eller länken för att låta andra gå med i <span className="text-white font-bold">"{eventName}"</span>.
            </p>
        </div>

        {/* QR Code Section */}
        <div className="flex justify-center mb-6 px-6">
            <div className="bg-white p-3 rounded-2xl shadow-xl transform transition-transform hover:scale-105 duration-300">
                 {/* Using standard QR API for zero-dep generation */}
                 <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=000000&margin=0`} 
                    alt="QR Code" 
                    className="w-48 h-48 rounded-lg mix-blend-multiply"
                 />
            </div>
        </div>

        {/* Code Display */}
        <div className="px-6 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Accesskod</span>
                <span className="text-3xl font-mono font-black text-white tracking-widest select-all">{accessCode}</span>
            </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-8 space-y-3">
            <button 
                onClick={handleNativeShare}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <Smartphone className="w-5 h-5" />
                {navigator.share ? 'Dela via...' : 'Kopiera Länk'}
            </button>
            
            <button 
                onClick={handleCopy}
                className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold border border-gray-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <LinkIcon className="w-5 h-5" />}
                {copied ? 'Kopierad!' : 'Kopiera direktlänk'}
            </button>
        </div>

      </div>
    </div>
  );
};
