
import React, { useState } from 'react';
import { X, Wand2, BrainCircuit, Users, Smile, Layers, BookOpen, FileSpreadsheet, AlertCircle, Check, ArrowRight, Dna, Rocket, Sparkles, PenTool, Search } from 'lucide-react';
import { Checkpoint, QuizData, RaceEvent } from '../types';

interface ContentGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
  onApplyUpdate: (updates: Partial<RaceEvent>) => void;
  currentRaceData: RaceEvent;
}

type MainTab = 'architect' | 'manual';
type BlueprintId = 'mystery' | 'quiz' | 'action' | 'family';

interface Blueprint {
    id: BlueprintId;
    title: string;
    description: string;
    icon: React.ElementType;
    colorFrom: string;
    colorTo: string;
    promptTemplate: string;
}

const BLUEPRINTS: Blueprint[] = [
    {
        id: 'mystery',
        title: 'Mysterium & Story',
        description: 'En sammanhängande berättelse där varje checkpoint är ett kapitel med ledtrådar.',
        icon: Search,
        colorFrom: 'from-purple-600',
        colorTo: 'to-indigo-900',
        promptTemplate: "Skapa ett mysterium/äventyr med en sammanhängande story. Varje checkpoint ska vara ett kapitel. Beskrivningen ska föra handlingen framåt. Lägg till en gåta eller fråga på varje plats som är kopplad till storyn."
    },
    {
        id: 'quiz',
        title: 'Tematiskt Quiz',
        description: 'En klassisk tipspromenad fokuserad på ett specifikt ämne eller allmänbildning.',
        icon: BrainCircuit,
        colorFrom: 'from-blue-600',
        colorTo: 'to-cyan-800',
        promptTemplate: "Skapa en tipspromenad (Quiz). Varje checkpoint ska ha en engagerande fråga med 3-4 svarsalternativ. Fokusera på kunskap och fakta inom temat."
    },
    {
        id: 'action',
        title: 'Action & Uppdrag',
        description: 'Fysiska utmaningar och roliga uppdrag istället för frågor. Perfekt för teambuilding.',
        icon: Rocket,
        colorFrom: 'from-orange-500',
        colorTo: 'to-red-800',
        promptTemplate: "Skapa ett action-fyllt event. Varje checkpoint ska innehålla en 'Challenge' (fysiskt uppdrag eller foto-uppdrag). Ingen storytext, rakt på sak. T.ex. 'Bygg en pyramid', 'Ta en selfie med en hund'."
    },
    {
        id: 'family',
        title: 'Familjeskoj',
        description: 'En mix av enkla frågor och roliga aktiviteter anpassade för barn och vuxna.',
        icon: Smile,
        colorFrom: 'from-green-500',
        colorTo: 'to-emerald-800',
        promptTemplate: "Skapa ett familjevänligt äventyr. Blanda enkla frågor för barn med roliga små uppdrag (t.ex. 'Hitta en kotte'). Håll tonen lekfull och uppmuntrande."
    }
];

export const ContentGeneratorDialog: React.FC<ContentGeneratorDialogProps> = ({ isOpen, onClose, onGenerate, onApplyUpdate, currentRaceData }) => {
  const [activeTab, setActiveTab] = useState<MainTab>('architect');
  
  // Architect State
  const [selectedBlueprint, setSelectedBlueprint] = useState<BlueprintId | null>(null);
  const [themeInput, setThemeInput] = useState('');
  const [audience, setAudience] = useState('Vuxna / Blandat');
  const [cpCount, setCpCount] = useState(5);

  // Manual State
  const [manualMode, setManualMode] = useState<'story' | 'bulk'>('story');
  const [storyText, setStoryText] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);

  if (!isOpen) return null;

  // --- ARCHITECT HANDLER ---
  const handleArchitectRun = () => {
      if (!selectedBlueprint) return;
      
      const blueprint = BLUEPRINTS.find(b => b.id === selectedBlueprint);
      
      const prompt = `
        ROLE: Du är "Adventure Architect", en expert på att skapa engagerande upplevelser.
        UPPGIFT: Skapa ett komplett äventyr baserat på följande specifikation.
        
        BLUEPRINT: ${blueprint?.title}
        TEMA: ${themeInput || 'Allmänt/Blandat'}
        MÅLGRUPP: ${audience}
        ANTAL CHECKPOINTS: ${cpCount}
        
        INSTRUKTIONER FÖR BLUEPRINT (${blueprint?.id}):
        ${blueprint?.promptTemplate}
        
        GENERELLA REGLER:
        1. Använd verktyget 'update_race_plan'.
        2. Sätt ett passande och kreativt 'name' på eventet.
        3. Skriv en inbjudande 'description' för hela eventet.
        4. Generera ${cpCount} checkpoints.
        5. VIKTIGT: Eftersom användaren inte angav platser, sätt 'location' till null (Draft Mode) på alla checkpoints så användaren får placera ut dem själv. Ge dem dock unika och beskrivande namn (t.ex. "Kapitel 1: Det gamla tornet" eller "Fråga 1").
        6. Språket ska vara Svenska.
      `;

      onGenerate(prompt);
      onClose();
  };

  // --- MANUAL HANDLERS ---
  const handleStoryApply = () => {
      if (!storyText.trim()) return;
      const chapters = storyText.split(/\n\s*\n/).filter(t => t.trim().length > 0);
      const newCheckpoints = [...currentRaceData.checkpoints];
      
      chapters.forEach((chapter, i) => {
          const cpName = `Kapitel ${i + 1}`;
          if (i < newCheckpoints.length) {
              newCheckpoints[i] = { ...newCheckpoints[i], description: chapter, name: cpName };
          } else {
              newCheckpoints.push({
                  id: `story-${Date.now()}-${i}`,
                  name: cpName,
                  location: null,
                  radiusMeters: 20,
                  type: 'mandatory',
                  description: chapter,
                  color: '#8b5cf6',
                  points: 10
              });
          }
      });
      onApplyUpdate({ checkpoints: newCheckpoints, checkpointOrder: 'sequential' });
      onClose();
  };

  const handleBulkApply = () => {
      if (!bulkText.trim()) return;
      setBulkError(null);
      try {
          const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
          const newCheckpoints = [...currentRaceData.checkpoints];
          let addedCount = 0;

          lines.forEach((line, index) => {
              const parts = line.split('|');
              if (parts.length < 2) return;
              const question = parts[0].trim();
              const options = parts[1].split(',').map(o => o.trim());
              const correctIdx = parts[2] ? parseInt(parts[2].trim()) : 0;
              while (options.length < 2) options.push("Ja"); 

              const quizData: QuizData = {
                  question: question,
                  options: options,
                  correctOptionIndex: (correctIdx >= 0 && correctIdx < options.length) ? correctIdx : 0
              };

              const targetIndex = index; // Simple append logic could be improved
               if (targetIndex < newCheckpoints.length) {
                  newCheckpoints[targetIndex] = {
                      ...newCheckpoints[targetIndex],
                      quiz: quizData,
                      type: 'mandatory',
                      name: `Fråga ${targetIndex + 1}`
                  };
              } else {
                  newCheckpoints.push({
                      id: `quiz-cp-${Date.now()}-${index}`,
                      name: `Fråga ${targetIndex + 1}`,
                      location: null, // Draft
                      radiusMeters: 25,
                      type: 'mandatory',
                      description: 'Svara rätt för att komma vidare!',
                      color: '#3b82f6',
                      points: 10,
                      quiz: quizData
                  });
              }
              addedCount++;
          });

          if (addedCount === 0) { setBulkError("Inga giltiga rader hittades."); return; }
          onApplyUpdate({ checkpoints: newCheckpoints });
          onClose();
      } catch (e) { setBulkError("Fel vid tolkning."); }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center border-b border-gray-800 bg-gray-900">
          <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                <Wand2 className="w-6 h-6 text-purple-500" /> AI Adventure Architect
              </h2>
              <p className="text-gray-400 text-xs mt-1">Designa, skapa och fyll ditt äventyr med innehåll.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950 px-8 pt-2 gap-6">
            <button 
                onClick={() => setActiveTab('architect')}
                className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'architect' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <Sparkles className="w-4 h-4" /> AI Architect
            </button>
            <button 
                onClick={() => setActiveTab('manual')}
                className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'manual' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
                <PenTool className="w-4 h-4" /> Manuell Inmatning
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gray-950">
            
            {/* --- ARCHITECT VIEW --- */}
            {activeTab === 'architect' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* 1. Blueprint Selector */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 block">1. Välj Blueprint (Mall)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {BLUEPRINTS.map((bp) => {
                                const Icon = bp.icon;
                                const isSelected = selectedBlueprint === bp.id;
                                return (
                                    <button
                                        key={bp.id}
                                        onClick={() => setSelectedBlueprint(bp.id)}
                                        className={`relative group p-5 rounded-2xl border text-left transition-all duration-300 h-full flex flex-col ${isSelected ? 'border-white bg-gray-800 scale-105 shadow-xl z-10' : 'border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bp.colorFrom} ${bp.colorTo} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="font-bold text-white mb-2">{bp.title}</h3>
                                        <p className="text-xs text-gray-400 leading-relaxed">{bp.description}</p>
                                        
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 text-green-400 bg-green-900/30 rounded-full p-1">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Configuration (Only shown if blueprint selected) */}
                    {selectedBlueprint && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 block">2. Anpassa Innehållet</label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-2">Tema / Ämne</label>
                                    <input 
                                        type="text"
                                        value={themeInput}
                                        onChange={(e) => setThemeInput(e.target.value)}
                                        placeholder={selectedBlueprint === 'quiz' ? "T.ex. 80-tals musik, Rymden..." : "T.ex. Spökhistoria, Deckare..."}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-2">Målgrupp</label>
                                    <select 
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none"
                                    >
                                        <option>Barn (6-10 år)</option>
                                        <option>Ungdomar</option>
                                        <option>Vuxna / Kompisgänget</option>
                                        <option>Företag / Teambuilding</option>
                                        <option>Blandat / Familj</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-8">
                                <label className="block text-xs font-bold text-gray-400 mb-2">Antal Checkpoints (Kapitel/Frågor)</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="3" 
                                        max="15" 
                                        value={cpCount} 
                                        onChange={(e) => setCpCount(parseInt(e.target.value))} 
                                        className="flex-1 accent-purple-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xl font-black text-purple-400 w-12 text-center">{cpCount}</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleArchitectRun}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-black text-lg shadow-lg shadow-purple-900/40 transform transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <Wand2 className="w-6 h-6 animate-pulse" />
                                GENERERA ÄVENTYR
                            </button>
                            <p className="text-center text-xs text-gray-500 mt-3">
                                AI:n kommer att skapa namn, beskrivningar och innehåll. Du placerar ut dem på kartan efteråt.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* --- MANUAL VIEW --- */}
            {activeTab === 'manual' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* Mode Switcher */}
                    <div className="flex gap-4 mb-6">
                        <button 
                            onClick={() => setManualMode('story')}
                            className={`flex-1 p-4 rounded-xl border text-left transition-all ${manualMode === 'story' ? 'bg-green-900/20 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                        >
                            <div className="flex items-center gap-2 mb-1 font-bold"><BookOpen className="w-4 h-4" /> Story Paste</div>
                            <div className="text-xs opacity-70">Klistra in text, vi delar upp den.</div>
                        </button>
                        <button 
                            onClick={() => setManualMode('bulk')}
                            className={`flex-1 p-4 rounded-xl border text-left transition-all ${manualMode === 'bulk' ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                        >
                            <div className="flex items-center gap-2 mb-1 font-bold"><FileSpreadsheet className="w-4 h-4" /> Bulk Quiz</div>
                            <div className="text-xs opacity-70">Importera många frågor samtidigt.</div>
                        </button>
                    </div>

                    {manualMode === 'story' && (
                        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Berättelsetext</label>
                            <textarea 
                                value={storyText}
                                onChange={(e) => setStoryText(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white h-64 resize-none focus:border-green-500 outline-none mb-4"
                                placeholder="Klistra in din text här. Använd dubbla radbrytningar (Enter x2) för att markera var ett nytt kapitel/checkpoint ska börja."
                            />
                            <button 
                                onClick={handleStoryApply} 
                                disabled={!storyText.trim()}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Skapa Checkpoints av Story
                            </button>
                        </div>
                    )}

                    {manualMode === 'bulk' && (
                        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-4 text-xs font-mono text-gray-400">
                                <div className="font-bold text-gray-300 mb-2">FORMAT:</div>
                                <div>Fråga | Alt 1, Alt 2, Alt 3 | Rätt Index (0-baserat)</div>
                                <div className="mt-2 text-blue-400">Exempel:</div>
                                <div>Vilken färg har himlen? | Grön, Blå, Röd | 1</div>
                            </div>
                            
                            <textarea 
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white h-64 resize-none focus:border-blue-500 outline-none mb-4 font-mono"
                                placeholder="Klistra in frågor här..."
                            />
                            
                            {bulkError && (
                                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" /> {bulkError}
                                </div>
                            )}

                            <button 
                                onClick={handleBulkApply} 
                                disabled={!bulkText.trim()}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Importera Frågor
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
