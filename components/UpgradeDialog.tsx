
import React, { useState } from 'react';
import { UserTier, TierConfig, UserProfile } from '../types';
import { X, Star, Zap, Crown, Map, Loader2, CreditCard, Lock, AlertTriangle, Unlock, Mail } from 'lucide-react';
import { ContactFormDialog } from './ContactFormDialog';

interface UpgradeDialogProps {
  currentTier: UserTier;
  userProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: UserTier) => void;
  tierConfigs: Record<UserTier, TierConfig>;
  customMessage?: string; // New prop to explain WHY the dialog opened
}

const TIER_VISUALS: Record<UserTier, {
  icon: React.ElementType;
}> = {
  SCOUT: {
    icon: Map
  },
  CREATOR: {
    icon: Zap
  },
  MASTER: {
    icon: Crown
  }
};

export const UpgradeDialog: React.FC<UpgradeDialogProps> = ({ currentTier, userProfile, isOpen, onClose, onUpgrade, tierConfigs, customMessage }) => {
  const [processingTier, setProcessingTier] = useState<UserTier | null>(null);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);

  if (!isOpen) return null;

  const handleTierSelect = (tier: UserTier) => {
      // MASTER opens the contact form instead of instant upgrade
      if (tier === 'MASTER') {
          setIsContactFormOpen(true);
          return;
      }

      // SCOUT is free
      if (tier === 'SCOUT') {
          onUpgrade(tier);
          return;
      }

      // For Paid Tiers, simulate Stripe Checkout
      setProcessingTier(tier);
      setTimeout(() => {
          onUpgrade(tier);
          setProcessingTier(null);
      }, 2500); // 2.5s simulated delay
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
       
       <ContactFormDialog 
          isOpen={isContactFormOpen} 
          onClose={() => setIsContactFormOpen(false)} 
          user={userProfile} 
       />

       {/* PAYMENT OVERLAY */}
       {processingTier && (
           <div className="absolute inset-0 z-[3100] bg-black/80 flex flex-col items-center justify-center animate-in fade-in duration-500">
               <div className="bg-white text-black p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                   <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                   <h3 className="text-xl font-bold mb-2">Ansluter till Stripe...</h3>
                   <p className="text-gray-500 text-sm mb-6">Säkrar anslutningen för uppgradering till {tierConfigs[processingTier].displayName}.</p>
                   
                   <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 bg-gray-100 py-2 rounded">
                       <Lock className="w-3 h-3" /> 256-BIT KRYPTERING
                   </div>
               </div>
           </div>
       )}

       <div className="max-w-6xl w-full flex flex-col max-h-[90vh] relative">
          
          {/* Header Section */}
          <div className="text-center mb-8 relative z-10">
              {/* TRIGGER MESSAGE BANNER */}
              {customMessage ? (
                  <div className="mx-auto max-w-2xl bg-amber-500/10 border border-amber-500/50 rounded-2xl p-6 mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-in slide-in-from-top-4 duration-500">
                      <div className="flex flex-col items-center gap-3">
                          <div className="p-3 bg-amber-500 rounded-full text-black shadow-lg animate-bounce">
                              <Unlock className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-black text-amber-400 uppercase tracking-wide">
                              Gränsen är nådd!
                          </h3>
                          <p className="text-lg text-white font-medium leading-relaxed">
                              {customMessage}
                          </p>
                          <p className="text-sm text-amber-200/80">
                              Uppgradera till <span className="font-bold text-white">Creator</span> för att ta bort alla begränsningar direkt.
                          </p>
                      </div>
                  </div>
              ) : (
                  <>
                    <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-4 drop-shadow-xl">
                        Välj Din Spelstil
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Lås upp kraftfulla verktyg för att skapa oförglömliga äventyr.
                    </p>
                  </>
              )}
              
              <button 
                onClick={onClose} 
                className="absolute top-0 right-0 md:-right-8 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors border border-gray-700"
              >
                  <X className="w-6 h-6 text-white" />
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-8 px-2">
              {(['SCOUT', 'CREATOR', 'MASTER'] as UserTier[]).map((tierKey) => {
                  const config = tierConfigs[tierKey];
                  const visual = TIER_VISUALS[tierKey];
                  const isCurrent = currentTier === tierKey;
                  const isRecommended = config.isRecommended;
                  const Icon = visual.icon;
                  const isMaster = tierKey === 'MASTER';

                  return (
                    <div 
                        key={tierKey}
                        className={`relative p-8 rounded-3xl border flex flex-col transition-all duration-300 hover:-translate-y-2 ${
                            isRecommended 
                            ? 'bg-gradient-to-b from-blue-900/40 to-slate-900 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)] scale-105 z-10' 
                            : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'
                        }`}
                    >
                        {isRecommended && (
                             <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 z-20">
                                <Star className="w-3 h-3 fill-white" /> REKOMMENDERAD
                             </div>
                        )}

                        <div className="mb-6 text-center">
                            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-xl ${
                                isRecommended ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-gray-800 text-gray-400'
                            }`}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{config.displayName}</h3>
                            <div className="text-3xl font-bold text-gray-100 mt-2">
                                {config.priceAmount === 'Offert' ? config.priceAmount : `${config.priceAmount} ${config.priceCurrency}`}
                            </div>
                            {config.priceFrequency && <div className="text-xs text-gray-500">{config.priceFrequency}</div>}
                        </div>

                        <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed h-16">
                            {config.description}
                        </p>

                        <ul className="space-y-4 mb-8 flex-1">
                            {config.features.map((feat, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                    <span className="shrink-0 mt-0.5 text-lg leading-none">✅</span>
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-col items-center">
                          <button
                              onClick={() => handleTierSelect(tierKey)}
                              disabled={isCurrent}
                              className={`w-full py-4 rounded-xl font-bold transition-all uppercase tracking-wide text-sm flex items-center justify-center gap-2 ${
                                  isCurrent
                                  ? 'bg-gray-800 text-gray-500 cursor-default border border-gray-700'
                                  : isRecommended
                                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
                                      : isMaster
                                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                                          : 'bg-white text-black hover:bg-gray-200'
                              }`}
                          >
                              {isCurrent ? (
                                  'Nuvarande Nivå'
                              ) : (
                                  <>
                                      {tierKey === 'CREATOR' && <CreditCard className="w-4 h-4" />}
                                      {isMaster && <Mail className="w-4 h-4" />}
                                      {config.buttonText}
                                  </>
                              )}
                          </button>
                          
                          {isMaster && (
                            <p className="text-[10px] text-gray-500 mt-3 text-center uppercase font-bold tracking-widest">
                                Frågor? Maila oss på <span className="text-indigo-400">hej@smartstudio.se</span>
                            </p>
                          )}
                        </div>
                    </div>
                  );
              })}
          </div>
       </div>
    </div>
  );
};
