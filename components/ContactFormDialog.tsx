
import React, { useState } from 'react';
import { X, Mail, Send, Building2, User, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { api } from '../services/dataService';
import { UserProfile, ContactRequest } from '../types';

interface ContactFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export const ContactFormDialog: React.FC<ContactFormDialogProps> = ({ isOpen, onClose, user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    organization: '',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const request: ContactRequest = {
        id: `lead-${Date.now()}`,
        ...formData,
        timestamp: new Date().toISOString(),
        userId: user.id === 'guest' ? undefined : user.id,
        status: 'new'
      };

      await api.leads.saveRequest(request);
      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to send contact request", error);
      alert("Kunde inte skicka din förfrågan. Kontrollera din anslutning.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {isSuccess ? (
          <div className="p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/40">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Tack för intresset!</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Vi har tagit emot din förfrågan. En äventyrsexpert kommer att kontakta dig på <strong>{formData.email}</strong> inom kort.
            </p>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all active:scale-95"
            >
              Stäng
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-white/5 bg-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 rounded-lg">
                  <Mail className="w-6 h-6 text-indigo-500" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Master Offert</h2>
              </div>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Lämna dina uppgifter så återkommer vi med ett förslag anpassat för din organisation.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Namn</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-700 outline-none focus:border-indigo-500 transition-all" 
                    placeholder="Förnamn & Efternamn"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">E-post</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-700 outline-none focus:border-indigo-500 transition-all" 
                    placeholder="Din e-postadress"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Organisation</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                  <input 
                    required
                    value={formData.organization}
                    onChange={e => setFormData({...formData, organization: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-700 outline-none focus:border-indigo-500 transition-all" 
                    placeholder="Företag, skola eller förening"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Meddelande (Valfritt)</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                  <textarea 
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-700 outline-none focus:border-indigo-500 transition-all min-h-[80px] resize-none" 
                    placeholder="Berätta kort om era behov..."
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Skicka Förfrågan
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
