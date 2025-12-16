
import React, { useState, useEffect } from 'react';
import { Checkpoint, QuizData } from '../types';
import { X, Save, HelpCircle, Zap, MapPin, List, CheckCircle2, Clock, Timer, Camera, Flag } from 'lucide-react';

interface CheckpointEditorDialogProps {
  checkpoint: Checkpoint | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCp: Checkpoint) => void;
  variant?: 'checkpoint' | 'start' | 'finish'; // New prop to handle simplified Start/Finish editing
}

export const CheckpointEditorDialog: React.FC<CheckpointEditorDialogProps> = ({ checkpoint, isOpen, onClose, onSave, variant = 'checkpoint' }) => {
  const [data, setData] = useState<Checkpoint | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'interaction'>('general');
  const [interactionType, setInteractionType] = useState<'none' | 'quiz' | 'challenge'>('none');
  
  // Local state for time modifier input in minutes (easier for user)
  const [timeModMinutes, setTimeModMinutes] = useState<number>(0);

  useEffect(() => {
    if (checkpoint) {
      setData({ ...checkpoint });
      if (checkpoint.quiz) setInteractionType('quiz');
      else if (checkpoint.challenge) setInteractionType('challenge');
      else setInteractionType('none');

      // Convert seconds to minutes for display, default to 0
      setTimeModMinutes((checkpoint.timeModifierSeconds || 0) / 60);
    }
  }, [checkpoint]);

  if (!isOpen || !data) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up data based on interaction type
    const finalData = { ...data };
    
    // Save time modifier in seconds
    finalData.timeModifierSeconds = timeModMinutes * 60;
    
    if (interactionType === 'none') {
        delete finalData.quiz;
        delete finalData.challenge;
    } else if (interactionType === 'quiz') {
        delete finalData.challenge;
        // Ensure quiz structure exists
        if (!finalData.quiz) {
             finalData.quiz = { question: '', options: ['', '', '', ''], correctOptionIndex: 0 };
        }
    } else if (interactionType === 'challenge') {
        delete finalData.quiz;
    }

    onSave(finalData);
    onClose();
  };

  const handleOptionChange = (index: number, value: string) => {
    if (!data.quiz) return;
    const newOptions = [...data.quiz.options];
    newOptions[index] = value;
    setData({ ...data, quiz: { ...data.quiz, options: newOptions } });
  };

  const initQuiz = () => {
    setData({
        ...data,
        quiz: { question: '', options: ['', '', '', ''], correctOptionIndex: 0 }
    });
  };

  const isSpecial = variant !== 'checkpoint';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {variant === 'start' ? 'Redigera Startplats' : variant === 'finish' ? 'Redigera Målområde' : 'Redigera Checkpoint'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Hide if special location */}
        {!isSpecial && (
            <div className="flex border-b border-gray-700 bg-gray-900/30 shrink-0">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'general' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    <List className="w-4 h-4" /> Grundinfo
                </button>
                <button 
                    onClick={() => setActiveTab('interaction')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'interaction' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    {interactionType === 'quiz' ? <HelpCircle className="w-4 h-4" /> : interactionType === 'challenge' ? <Zap className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    Interaktion / Uppdrag
                </button>
            </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'general' ? (
                <div className="space-y-4">
                    {/* Special Header for Start/Finish Context */}
                    {isSpecial && (
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                {variant === 'start' ? <MapPin className="w-5 h-5 text-green-400" /> : <Flag className="w-5 h-5 text-red-400" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">
                                    {variant === 'start' ? 'Startzon' : 'Målzon'}
                                </h3>
                                <p className="text-xs text-blue-200">
                                    Här ställer du in hur stor radien ska vara för {variant === 'start' ? 'startplatsen' : 'målgången'}. 
                                    En större radie gör det lättare för GPS:en att registrera {variant === 'start' ? 'närvaro' : 'målgång'}.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isSpecial && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Namn</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    
                    {/* Scores & Time Modifier - Only for checkpoints */}
                    {!isSpecial && (
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-yellow-500" /> Poäng (Score)
                                </label>
                                <input
                                    type="number"
                                    value={data.points || 0}
                                    onChange={(e) => setData({ ...data, points: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-400" /> Tidsjustering (Minuter)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={timeModMinutes}
                                        onChange={(e) => setTimeModMinutes(parseFloat(e.target.value) || 0)}
                                        placeholder="-5 för 5 min avdrag"
                                        className={`w-full bg-gray-900 border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 ${timeModMinutes < 0 ? 'border-green-500 text-green-400 focus:ring-green-500' : timeModMinutes > 0 ? 'border-red-500 text-red-400 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none">
                                        {timeModMinutes < 0 ? 'AVDRAG' : timeModMinutes > 0 ? 'STRAFF' : 'INGEN'}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">Negativt värde = Drar av tid från slutresultatet (Bra).</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {!isSpecial && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Typ</label>
                                <select
                                    value={data.type}
                                    onChange={(e) => setData({ ...data, type: e.target.value as 'mandatory' | 'optional' })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="mandatory">Obligatorisk (Krav)</option>
                                    <option value="optional">Valfri (Extra)</option>
                                </select>
                            </div>
                        )}
                        <div className={isSpecial ? 'col-span-2' : ''}>
                             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Radie (meter)</label>
                             <div className="flex items-center gap-3">
                                 <input
                                    type="range"
                                    min="10"
                                    max="200"
                                    step="5"
                                    value={data.radiusMeters}
                                    onChange={(e) => setData({ ...data, radiusMeters: parseInt(e.target.value) || 25 })}
                                    className="flex-1 accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <input
                                    type="number"
                                    value={data.radiusMeters}
                                    onChange={(e) => setData({ ...data, radiusMeters: parseInt(e.target.value) || 25 })}
                                    className="w-20 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                             </div>
                             <p className="text-xs text-gray-500 mt-1">Standardradie är vanligtvis 20-50m.</p>
                        </div>
                    </div>

                    {!isSpecial && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Färgmarkör</label>
                            <div className="flex gap-3 flex-wrap">
                                {['#3b82f6', '#10B981', '#F1C40F', '#E74C3C', '#9B59B6', '#EC4899', '#6366f1'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setData({ ...data, color: c })}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform ${data.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {!isSpecial && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Beskrivning</label>
                            <textarea
                                value={data.description || ''}
                                onChange={(e) => setData({ ...data, description: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                placeholder="Beskriv platsen, terrängen eller ledtrådar..."
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-gray-900 rounded-xl border border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="interaction" 
                                checked={interactionType === 'none'} 
                                onChange={() => setInteractionType('none')}
                                className="w-4 h-4 text-blue-500 focus:ring-blue-500 bg-gray-800 border-gray-600"
                            />
                            <span className="text-sm font-medium text-gray-300">Ingen</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="interaction" 
                                checked={interactionType === 'quiz'} 
                                onChange={() => {
                                    setInteractionType('quiz');
                                    if (!data.quiz) initQuiz();
                                }}
                                className="w-4 h-4 text-purple-500 focus:ring-purple-500 bg-gray-800 border-gray-600"
                            />
                            <span className="text-sm font-medium text-purple-300 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Quiz / Tipspromenad</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="interaction" 
                                checked={interactionType === 'challenge'} 
                                onChange={() => {
                                    setInteractionType('challenge');
                                    if (!data.challenge) setData({...data, challenge: ''});
                                }}
                                className="w-4 h-4 text-orange-500 focus:ring-orange-500 bg-gray-800 border-gray-600"
                            />
                            <span className="text-sm font-medium text-orange-300 flex items-center gap-1"><Zap className="w-3 h-3" /> Fysisk Utmaning</span>
                        </label>
                    </div>

                    {/* Photo Proof Toggle - Available for all interactions except pure quiz usually, but let's allow for all */}
                    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600">
                                 <Camera className="w-5 h-5 text-gray-300" />
                             </div>
                             <div>
                                 <div className="text-sm font-bold text-white">Kräv Bildbevis</div>
                                 <div className="text-xs text-gray-500">Deltagaren måste ladda upp foto för att checka in</div>
                             </div>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={data.requiresPhoto || false} 
                                onChange={(e) => setData({...data, requiresPhoto: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {interactionType === 'quiz' && data.quiz && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fråga</label>
                                <input
                                    type="text"
                                    value={data.quiz.question}
                                    onChange={(e) => setData({ ...data, quiz: { ...data.quiz!, question: e.target.value } })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Skriv din fråga här..."
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Svarsalternativ (Markera det rätta)</label>
                                <div className="space-y-2">
                                    {data.quiz.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <input 
                                                type="radio"
                                                name="correctOption"
                                                checked={data.quiz!.correctOptionIndex === idx}
                                                onChange={() => setData({ ...data, quiz: { ...data.quiz!, correctOptionIndex: idx } })}
                                                className="w-4 h-4 text-green-500 focus:ring-green-500 bg-gray-900 border-gray-600 cursor-pointer"
                                            />
                                            <div className="flex-1 relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{String.fromCharCode(65 + idx)}</span>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                    className={`w-full bg-gray-900 border rounded-lg pl-8 pr-4 py-2 text-white focus:outline-none focus:ring-2 text-sm ${data.quiz!.correctOptionIndex === idx ? 'border-green-500 focus:ring-green-500' : 'border-gray-600 focus:ring-purple-500'}`}
                                                    placeholder={`Alternativ ${idx + 1}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {interactionType === 'challenge' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Uppdragsbeskrivning</label>
                                <textarea
                                    value={data.challenge || ''}
                                    onChange={(e) => setData({ ...data, challenge: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[120px]"
                                    placeholder="T.ex. 'Gör 20 armhävningar och ta en bild', 'Hitta årtalet på stenen'..."
                                />
                                <p className="text-xs text-gray-500 mt-2">Deltagaren måste manuellt bekräfta att de utfört uppdraget för att få poängen.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/50 shrink-0 flex justify-end gap-3">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Spara Ändringar
            </button>
        </div>

      </div>
    </div>
  );
};
