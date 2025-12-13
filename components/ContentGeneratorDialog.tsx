
import React, { useState } from 'react';
import { X, Wand2, BrainCircuit, Users, Smile, Layers, BookOpen, FileSpreadsheet, AlertCircle, Check, ArrowRight, Skull, Radiation } from 'lucide-react';
import { Checkpoint, QuizData, RaceEvent } from '../types';

interface ContentGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void; // Legacy AI
  onApplyUpdate: (updates: Partial<RaceEvent>) => void; // New Direct Update
  currentRaceData: RaceEvent;
}

type TabMode = 'ai' | 'story' | 'bulk_quiz' | 'zombie';

export const ContentGeneratorDialog: React.FC<ContentGeneratorDialogProps> = ({ isOpen, onClose, onGenerate, onApplyUpdate, currentRaceData }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('ai');

  // AI State
  const [aiConfig, setAiConfig] = useState({
      theme: '',
      audience: 'Vuxna / Motionärer',
      vibe: 'Roligt & Utmanande',
      count: 5,
      contentType: 'mixed' as 'quiz' | 'challenge' | 'mixed'
  });

  // Story State
  const [storyText, setStoryText] = useState('');
  const [storyMode, setStoryMode] = useState<'overwrite' | 'append'>('overwrite');

  // Bulk Quiz State
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);

  if (!isOpen) return null;

  // --- AI HANDLER ---
  const handleAiGenerate = () => {
    const prompt = `
      Jag vill att du genererar ${aiConfig.count} st ${aiConfig.contentType === 'mixed' ? 'blandade quiz-frågor och utmaningar' : aiConfig.contentType === 'quiz' ? 'quiz-frågor (tipspromenad)' : 'fysiska utmaningar'}.
      Målgrupp: ${aiConfig.audience}
      Tema/Ämne: ${aiConfig.theme || 'Allmänbildning och Äventyr'}
      Stämning/Svårighetsgrad: ${aiConfig.vibe}
      Applicera dessa på mina nuvarande checkpoints. Om jag har färre än ${aiConfig.count} checkpoints, skapa nya checkpoints automatiskt i närheten av start/mål.
    `;
    onGenerate(prompt);
    onClose();
  };

  // --- ZOMBIE MODE HANDLER ---
  const handleZombieGenerate = () => {
    const startLat = currentRaceData.startLocation.lat;
    const startLng = currentRaceData.startLocation.lng;

    const prompt = `
      SYSTEM / ROLE: You are the "Apocalypse Architect", the AI Engine behind the Quester app's survival mode. 
      Your sole purpose is to generate a thrilling, immersive "Zombie Run" scenario based on the user's current start location.
      
      INPUT CONTEXT:
      Start Location: { lat: ${startLat}, lng: ${startLng} }
      Difficulty/Intensity: Medium (Approx. 3-4 km total distance).
      
      CONSTRAINTS & RULES:
      1. Generate exactly 3 "Safe Houses" (Mandatory Checkpoints) that form a route.
      2. Generate exactly 5 "Zombie Nests" (Danger Zones) scattered between the safe houses to create tension.
      3. Narrative: Write a short, urgent introductory backstory for the Event Description.
      
      EXECUTION INSTRUCTION:
      Use the \`update_race_plan\` tool to apply this scenario to the map:
      
      1. Map "Safe Houses" to checkpoints with:
         - type: 'mandatory'
         - color: '#10B981' (Green)
         - name: "Safe House: [Name]"
         - points: 100
         - description: "Supplies secured. Move to the next point!"
         
      2. Map "Zombie Nests" to checkpoints with:
         - type: 'optional'
         - color: '#EF4444' (Red)
         - name: "⚠️ ZOMBIE NEST"
         - description: "HIGH INFECTION RATE. AVOID THIS AREA! Penalty if entered."
         - points: -50 (Negative points / Penalty)
         - radiusMeters: 40
         
      3. Set \`name\` to a dramatic Zombie Run name.
      4. Set \`description\` to the Narrative Intro.
      5. Set \`category\` to "Survival Run".
    `;
    
    onGenerate(prompt);
    onClose();
  };

  // --- STORY HANDLER ---
  const handleStoryApply = () => {
      if (!storyText.trim()) return;

      // Simple split by double newline (paragraphs)
      const chapters = storyText.split(/\n\s*\n/).filter(t => t.trim().length > 0);
      
      if (chapters.length === 0) return;

      const newCheckpoints = [...currentRaceData.checkpoints];
      const startLat = currentRaceData.startLocation.lat;
      const startLng = currentRaceData.startLocation.lng;

      // Helper to create coord
      const getOffsetCoord = (idx: number) => ({
          lat: startLat + (Math.random() - 0.5) * 0.005 + (idx * 0.001), 
          lng: startLng + (Math.random() - 0.5) * 0.005 + (idx * 0.001)
      });

      chapters.forEach((chapterText, index) => {
          if (index < newCheckpoints.length) {
              // Update existing
              newCheckpoints[index] = {
                  ...newCheckpoints[index],
                  description: chapterText,
                  name: `Kapitel ${index + 1}`
              };
          } else {
              // Create new
              newCheckpoints.push({
                  id: `story-cp-${Date.now()}-${index}`,
                  name: `Kapitel ${index + 1}`,
                  location: getOffsetCoord(index),
                  radiusMeters: 25,
                  type: 'mandatory',
                  description: chapterText,
                  color: '#8b5cf6', // Purple for story
                  points: 10
              });
          }
      });

      onApplyUpdate({ 
          checkpoints: newCheckpoints, 
          checkpointOrder: 'sequential' // Stories usually need order
      });
      onClose();
  };

  // --- BULK QUIZ HANDLER ---
  const handleBulkApply = () => {
      if (!bulkText.trim()) return;
      setBulkError(null);

      try {
          const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
          const newCheckpoints = [...currentRaceData.checkpoints];
          const startLat = currentRaceData.startLocation.lat;
          const startLng = currentRaceData.startLocation.lng;
          
          let addedCount = 0;

          lines.forEach((line, index) => {
              // Expected format: Question | Opt1,Opt2,Opt3 | CorrectIndex (0-based)
              const parts = line.split('|');
              
              if (parts.length < 2) return; // Skip invalid lines

              const question = parts[0].trim();
              const options = parts[1].split(',').map(o => o.trim());
              const correctIdx = parts[2] ? parseInt(parts[2].trim()) : 0;

              // Validate options
              while (options.length < 2) options.push("Ja"); 
              if (options.length < 4 && options.length > 2) options.push("Kanske");

              const quizData: QuizData = {
                  question: question,
                  options: options,
                  correctOptionIndex: (correctIdx >= 0 && correctIdx < options.length) ? correctIdx : 0
              };

              // Determine target checkpoint
              const targetIndex = index; // Simple mapping 1 line = 1 CP

               if (targetIndex < newCheckpoints.length) {
                  // Update existing
                  newCheckpoints[targetIndex] = {
                      ...newCheckpoints[targetIndex],
                      quiz: quizData,
                      type: 'mandatory',
                      name: `Fråga ${targetIndex + 1}`
                  };
              } else {
                  // Create new
                  newCheckpoints.push({
                      id: `quiz-cp-${Date.now()}-${index}`,
                      name: `Fråga ${targetIndex + 1}`,
                      location: {
                          lat: startLat + (Math.random() - 0.5) * 0.008,
                          lng: startLng + (Math.random() - 0.5) * 0.008
                      },
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

          if (addedCount === 0) {
              setBulkError("Kunde inte tolka några rader. Kontrollera formatet.");
              return;
          }

          onApplyUpdate({ checkpoints: newCheckpoints });
          onClose();

      } catch (e) {
          setBulkError("Ett fel uppstod vid tolkningen. Kontrollera formatet.");
      }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-800 bg-gray-900">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" /> Content Studio
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <Wand2 className="w-4 h-4" /> AI Generator
            </button>
             <button 
                onClick={() => setActiveTab('zombie')}
                className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'zombie' ? 'border-red-500 text-red-400 bg-red-900/10' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <Skull className="w-4 h-4" /> Zombie Survival
            </button>
            <button 
                onClick={() => setActiveTab('story')}
                className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'story' ? 'border-green-500 text-green-400 bg-green-900/10' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <BookOpen className="w-4 h-4" /> Story
            </button>
            <button 
                onClick={() => setActiveTab('bulk_quiz')}
                className={`flex-1 py-4 px-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bulk_quiz' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <FileSpreadsheet className="w-4 h-4" /> Eget Quiz
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* --- AI TAB --- */}
            {activeTab === 'ai' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                     <p className="text-sm text-gray-400 bg-purple-900/20 p-3 rounded-lg border border-purple-500/20">
                        Låt AI:n skapa innehåll åt dig baserat på ett tema. Perfekt för snabb inspiration.
                    </p>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Vad vill du skapa?</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['quiz', 'challenge', 'mixed'].map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setAiConfig({...aiConfig, contentType: type as any})}
                                    className={`p-2 rounded-lg text-xs font-bold border capitalize transition-all ${aiConfig.contentType === type ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                >
                                    {type === 'mixed' ? 'Blandat' : type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <BrainCircuit className="w-3 h-3" /> Tema / Ämne
                        </label>
                        <input 
                            type="text" 
                            value={aiConfig.theme}
                            onChange={(e) => setAiConfig({...aiConfig, theme: e.target.value})}
                            placeholder="T.ex. Skogsdjur, 80-talsmusik, Harry Potter..."
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Målgrupp</label>
                            <select 
                                value={aiConfig.audience}
                                onChange={(e) => setAiConfig({...aiConfig, audience: e.target.value})}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm"
                            >
                                <option>Barn (6-10 år)</option>
                                <option>Ungdomar</option>
                                <option>Familj (Blandat)</option>
                                <option>Vuxna / Motionärer</option>
                                <option>Företag / Teambuilding</option>
                            </select>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Antal Checkpoints</label>
                             <input 
                                type="number" 
                                min="1" 
                                max="20" 
                                value={aiConfig.count}
                                onChange={(e) => setAiConfig({...aiConfig, count: parseInt(e.target.value)})}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- ZOMBIE TAB --- */}
            {activeTab === 'zombie' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="flex gap-3 bg-red-900/20 p-4 rounded-xl border border-red-500/20 items-start">
                        <div className="p-2 bg-red-900/50 rounded-lg">
                             <Radiation className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Apocalypse Architect</h3>
                            <p className="text-xs text-red-200 mt-1">
                                Skapa ett överlevnadsscenario ("Zombie Run") baserat på din nuvarande plats. 
                                AI:n placerar ut "Safe Houses" (Mål) och "Zombie Nests" (Fällor) automatiskt.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Detta genereras:</h4>
                        <ul className="space-y-2">
                             <li className="flex items-center gap-2 text-sm text-gray-300">
                                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                 3 st <strong>Safe Houses</strong> (Obligatoriska)
                             </li>
                             <li className="flex items-center gap-2 text-sm text-gray-300">
                                 <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                 5 st <strong>Zombie Nests</strong> (Fällor / Minuspoäng)
                             </li>
                             <li className="flex items-center gap-2 text-sm text-gray-300">
                                 <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                 Unik <strong>Bakgrundshistoria</strong>
                             </li>
                        </ul>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-gray-500 italic">
                            "Varning: Hög intensitet. Spring för livet."
                        </p>
                    </div>
                </div>
            )}

            {/* --- STORY TAB --- */}
            {activeTab === 'story' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-sm text-gray-400 bg-green-900/20 p-3 rounded-lg border border-green-500/20">
                        Klistra in en saga, ett mysterium eller en berättelse. Vi delar upp texten i stycken och placerar ett "kapitel" på varje checkpoint.
                    </p>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            Berättelsetext
                        </label>
                        <textarea 
                            value={storyText}
                            onChange={(e) => setStoryText(e.target.value)}
                            placeholder="Det var en gång i en mörk skog... (Tryck Enter två gånger för nytt kapitel)"
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-green-500 focus:outline-none min-h-[200px]"
                        />
                        <p className="text-xs text-gray-500 mt-2">Tips: Använd dubbla radbrytningar för att markera var ett nytt kapitel (checkpoint) ska börja.</p>
                    </div>
                </div>
            )}

            {/* --- BULK QUIZ TAB --- */}
            {activeTab === 'bulk_quiz' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                     <p className="text-sm text-gray-400 bg-blue-900/20 p-3 rounded-lg border border-blue-500/20">
                        Skapa en tipspromenad snabbt genom att klistra in dina frågor. Perfekt för personliga quiz!
                    </p>

                    <div className="p-4 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-gray-400 mb-4">
                        <div className="font-bold text-gray-300 mb-1">Format:</div>
                        <div>Fråga | Alternativ1, Alternativ2, Alternativ3 | Rätt Index (0, 1 eller 2)</div>
                        <div className="mt-2 font-bold text-gray-300">Exempel:</div>
                        <div className="text-green-400">Vad heter födelsedagsbarnet? | Anna, Bertil, Caesar | 0</div>
                        <div className="text-green-400">Vilket år är det? | 2020, 2024, 2025 | 2</div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            Dina Frågor
                        </label>
                        <textarea 
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder="Klistra in frågor här..."
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm font-mono focus:border-blue-500 focus:outline-none min-h-[200px]"
                        />
                    </div>
                    
                    {bulkError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-900/20 p-3 rounded border border-red-900/50">
                            <AlertCircle className="w-4 h-4" /> {bulkError}
                        </div>
                    )}
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-colors">
              Avbryt
            </button>
            
            {activeTab === 'ai' && (
                <button onClick={handleAiGenerate} className="px-6 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 flex items-center gap-2">
                    <Wand2 className="w-4 h-4" /> Generera med AI
                </button>
            )}
            
            {activeTab === 'zombie' && (
                <button onClick={handleZombieGenerate} className="px-6 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 flex items-center gap-2 animate-pulse">
                    <Skull className="w-4 h-4" /> Starta Outbreak
                </button>
            )}

            {activeTab === 'story' && (
                <button onClick={handleStoryApply} disabled={!storyText.trim()} className="px-6 py-2 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 flex items-center gap-2 disabled:opacity-50">
                    <Check className="w-4 h-4" /> Applicera Story
                </button>
            )}

            {activeTab === 'bulk_quiz' && (
                <button onClick={handleBulkApply} disabled={!bulkText.trim()} className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50">
                    <ArrowRight className="w-4 h-4" /> Importera Quiz
                </button>
            )}
        </div>

      </div>
    </div>
  );
};
