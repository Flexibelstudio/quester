
import React from 'react';
import { X, Heart, Zap, Globe, Compass, Cpu, Mail, ArrowRight } from 'lucide-react';

interface AboutUsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsDialog: React.FC<AboutUsDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Hero Header */}
        <div className="relative h-48 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shrink-0 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
            
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-20">
                <X className="w-6 h-6" />
            </button>

            <div className="text-center relative z-10">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-xl">
                    <Compass className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Om Quester</h2>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-slate-950 text-slate-300 space-y-12">
            
            {/* Our Why */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 text-blue-400 mb-2">
                    <Heart className="w-5 h-5 fill-current" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Vår Vision</span>
                </div>
                <h3 className="text-2xl font-black text-white leading-tight uppercase italic">Varför vi byggde detta</h3>
                <p className="text-lg leading-relaxed text-slate-400">
                    I en värld där vi spenderar allt mer tid framför skärmar ville vi skapa en brygga tillbaka till verkligheten. 
                    <span className="text-white font-bold"> Quester</span> föddes ur idén att verkligheten är den mest kraftfulla spelplanen som finns. 
                    Vi vill göra det enkelt, spännande och tillgängligt för alla att skapa äventyr som får folk att springa, skratta och utforska sin omgivning.
                </p>
            </section>

            {/* AI & Tech */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-slate-900 rounded-3xl border border-white/5 space-y-3">
                    <Cpu className="w-8 h-8 text-purple-500 mb-2" />
                    <h4 className="text-lg font-bold text-white uppercase tracking-tight">Användarvänlig Design</h4>
                    <p className="text-sm leading-relaxed text-slate-400">
                        Vi fokuserar på kraftfulla verktyg som är enkla att förstå. Dra och släpp på kartan, lägg till dina frågor och starta loppet direkt.
                    </p>
                </div>
                <div className="p-6 bg-slate-900 rounded-3xl border border-white/5 space-y-3">
                    <Globe className="w-8 h-8 text-green-500 mb-2" />
                    <h4 className="text-lg font-bold text-white uppercase tracking-tight">Sömlös Teknik</h4>
                    <p className="text-sm leading-relaxed text-slate-400">
                        Vi tror på "No-Friction". Inga tunga appar att ladda ner, ingen krånglig registrering för deltagare. Allt körs direkt i webbläsaren med modern GPS-teknik.
                    </p>
                </div>
            </div>

            {/* SmartStudio */}
            <section className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-8 items-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shrink-0 flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <Zap className="w-10 h-10 text-white fill-current" />
                </div>
                <div>
                    <h4 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Skapat av SmartStudio</h4>
                    <p className="text-sm leading-relaxed text-slate-400">
                        Vi är ett kreativt team som älskar kombinationen av teknik och frisk luft. 
                        Quester är vårt flaggskeppsprojekt för att visa hur modern teknik kan användas för att främja hälsa, rörelse och gemenskap.
                    </p>
                </div>
            </section>

            {/* Contact Info */}
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-8 text-center">
                <h4 className="text-white font-bold mb-2 uppercase tracking-widest text-xs opacity-50">Frågor eller idéer?</h4>
                <p className="text-sm text-blue-200/70 mb-4">Vi älskar att höra från våra användare. Skicka ett mail till:</p>
                <a 
                    href="mailto:hej@smartstudio.se" 
                    className="text-2xl md:text-3xl font-black text-blue-400 hover:text-blue-300 transition-colors tracking-tighter flex items-center justify-center gap-3 group"
                >
                    <Mail className="w-6 h-6 md:w-8 md:h-8 group-hover:scale-110 transition-transform" />
                    hej@smartstudio.se
                </a>
            </div>
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Quester v2.5 • Powered by SmartStudio</span>
        </div>
      </div>
    </div>
  );
};
