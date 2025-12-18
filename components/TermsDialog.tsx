
import React from 'react';
/* Lade till PenTool och MapPin i importer från lucide-react */
import { X, ShieldCheck, AlertTriangle, Eye, Scale, FileText, PenTool, MapPin } from 'lucide-react';

interface TermsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const TermsDialog: React.FC<TermsDialogProps> = ({ isOpen, onClose, initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = React.useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                    <ShieldCheck className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Juridisk Information</h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950">
            <button 
                onClick={() => setActiveTab('terms')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'terms' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500'}`}
            >
                Användarvillkor
            </button>
            <button 
                onClick={() => setActiveTab('privacy')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'privacy' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500'}`}
            >
                Integritetspolicy
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-900 text-slate-300 space-y-6">
            {activeTab === 'terms' ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                    <section>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-2 italic uppercase">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" /> 1. Säkerhet & Ansvar (Viktigt!)
                        </h3>
                        <p className="text-sm leading-relaxed">
                            Quester är en plattform för fysiska aktiviteter i verkligheten. Genom att använda tjänsten godkänner du att all rörelse sker på egen risk. 
                            <strong> Du ansvarar själv för att följa trafikregler, respektera privat egendom och agera säkert i terrängen. </strong> 
                            SmartStudio och Quester ansvarar inte för skador på person eller egendom som uppstår i samband med användning av appen.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-2 italic uppercase">
                            <PenTool className="w-4 h-4 text-blue-400" /> 2. Användargenererat Innehåll
                        </h3>
                        <p className="text-sm leading-relaxed">
                            När du skapar ett event eller laddar upp bildbevis som deltagare, intygar du att du äger rättigheterna till innehållet. 
                            Inget stötande, olagligt eller kränkande material får publiceras. Vi förbehåller oss rätten att radera innehåll och stänga av konton som bryter mot detta.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-2 italic uppercase">
                            <Scale className="w-4 h-4 text-purple-400" /> 3. AI-funktionalitet
                        </h3>
                        <p className="text-sm leading-relaxed">
                            Vissa delar av tjänsten drivs av AI. Vi garanterar inte korrektheten i AI-genererade texter. 
                            Arrangören bör alltid granska allt innehåll manuellt innan deltagare bjuds in.
                        </p>
                    {/* Fixade en felaktig avslutande tagg här */}
                    </section>

                    <section>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-2 italic uppercase">
                            <FileText className="w-4 h-4 text-gray-400" /> 4. Kommersiell användning
                        </h3>
                        <p className="text-sm leading-relaxed">
                            Gratisversionen (Scout) är endast för privat bruk. För företagsevent, skolor eller kommersiella arrangemang krävs en giltig licens (Creator eller Master).
                        </p>
                    </section>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
                    <section>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-2 italic uppercase">
                            <Eye className="w-4 h-4 text-green-400" /> 1. Datainsamling
                        </h3>
                        <p className="text-sm leading-relaxed">
                            Vi samlar in den information du anger vid registrering (namn, e-post) samt den platsdata som krävs för att tjänsten ska fungera under ett pågående lopp. 
                            Vi säljer aldrig din data till tredje part.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-2 italic uppercase">
                            <MapPin className="w-4 h-4 text-blue-400" /> 2. Platsdata
                        </h3>
                        <p className="text-sm leading-relaxed">
                            GPS-positioner sparas endast i syfte att verifiera incheckningar vid checkpoints och för att visa din position på kartan för arrangören (om Master-läge används). 
                            Vi spårar inte din rörelse när appen är stängd eller när du inte deltar i ett lopp.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-white font-bold flex items-center gap-2 mb-2 italic uppercase">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" /> 3. Lagring
                        </h3>
                        <p className="text-sm leading-relaxed">
                            Ditt innehåll lagras säkert. Uppladdade bilder för bildbevis raderas normalt sett efter att ett event arkiverats eller tagits bort av arrangören.
                        </p>
                    </section>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-center">
            <button 
                onClick={onClose}
                className="px-10 py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95"
            >
                Jag förstår
            </button>
        </div>
      </div>
    </div>
  );
};
