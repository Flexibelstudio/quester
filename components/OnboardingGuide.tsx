
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, MapPin, PlayCircle, Flag, Wand2, Settings2, MousePointer2 } from 'lucide-react';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Välkommen till Mission Control",
    description: "Här är din arbetsyta för att bygga äventyret. Kartan är din canvas – låt oss gå igenom verktygen för att skapa din bana.",
    icon: <MapPin className="w-12 h-12 text-blue-400" />,
    color: "from-blue-600 to-blue-900"
  },
  {
    title: "1. Placera Start & Mål",
    description: "Börja alltid med att definiera var äventyret börjar och slutar. Använd verktygsfältet längst ner för att välja Start (Play) eller Mål (Flagga) och klicka på kartan.",
    icon: <div className="flex gap-2"><PlayCircle className="w-10 h-10 text-green-400" /><Flag className="w-10 h-10 text-red-400" /></div>,
    color: "from-green-600 to-slate-900"
  },
  {
    title: "2. Lägg till Checkpoints",
    description: "Klicka på Plus-ikonen (+) i verktygsfältet och sedan på kartan för att placera ut kontroller. Du kan dra och släppa dem i efterhand för att finjustera positionen.",
    icon: <div className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center font-bold text-2xl text-white">+</div>,
    color: "from-purple-600 to-indigo-900"
  },
  {
    title: "3. Redigera & Innehåll",
    description: "Klicka på en utplacerad markör för att öppna dess meny. Där kan du lägga till quiz-frågor, fysiska utmaningar eller ändra poängvärdet.",
    icon: <MousePointer2 className="w-12 h-12 text-yellow-400" />,
    color: "from-yellow-600 to-orange-900"
  },
  {
    title: "4. Använd AI-Kraft",
    description: "Har du idétorka? När du placerat Start och Mål kan du klicka på Trollstaven (🪄). Vår AI kan generera teman, frågor och placera ut checkpoints åt dig.",
    icon: <Wand2 className="w-12 h-12 text-pink-400" />,
    color: "from-pink-600 to-rose-900"
  },
  {
    title: "5. Inställningar & Spara",
    description: "Uppe i hörnet hittar du inställningar för regler, tidsgränser och om loppet ska vara publikt. Glöm inte att spara ditt arbete ofta!",
    icon: <Settings2 className="w-12 h-12 text-gray-300" />,
    color: "from-gray-600 to-gray-900"
  }
];

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const stepData = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Background Gradient */}
        <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br ${stepData.color} opacity-20 transition-colors duration-500`}></div>
        <div className={`absolute top-[-50px] right-[-50px] w-40 h-40 bg-gradient-to-br ${stepData.color} rounded-full blur-[60px] opacity-40 animate-pulse`}></div>

        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/50 hover:text-white transition-colors z-50"
        >
            <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative z-10 p-8 pt-12 flex flex-col items-center text-center min-h-[400px]">
            
            {/* Icon Circle */}
            <div className="w-24 h-24 rounded-3xl bg-gray-800/80 backdrop-blur border border-white/10 flex items-center justify-center mb-6 shadow-xl transform transition-all duration-300 hover:scale-105">
                {stepData.icon}
            </div>

            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">
                {stepData.title}
            </h2>
            
            <p className="text-gray-400 text-base leading-relaxed mb-8 flex-1">
                {stepData.description}
            </p>

            {/* Pagination Dots */}
            <div className="flex gap-2 mb-8">
                {STEPS.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-blue-500' : 'w-1.5 bg-gray-700'}`}
                    />
                ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 w-full">
                <button 
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${currentStep === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                    <ChevronLeft className="w-4 h-4" /> Bakåt
                </button>
                
                <button 
                    onClick={handleNext}
                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                >
                    {currentStep === STEPS.length - 1 ? 'Sätt Igång!' : 'Nästa'}
                    {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
