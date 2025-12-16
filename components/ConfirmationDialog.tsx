
import React from 'react';
import { AlertTriangle, Info, X, Check, Trash2, ShieldAlert } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info' | 'success' | 'warning';
  icon?: React.ElementType;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Bekräfta",
  cancelText = "Avbryt",
  variant = 'info',
  icon: IconOverride
}) => {
  if (!isOpen) return null;

  const styles = {
    danger: {
      iconBg: 'bg-red-900/30 border-red-500/50 text-red-500',
      button: 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20',
      icon: Trash2
    },
    warning: {
      iconBg: 'bg-amber-900/30 border-amber-500/50 text-amber-500',
      button: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20',
      icon: AlertTriangle
    },
    success: {
      iconBg: 'bg-green-900/30 border-green-500/50 text-green-500',
      button: 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20',
      icon: Check
    },
    info: {
      iconBg: 'bg-blue-900/30 border-blue-500/50 text-blue-500',
      button: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20',
      icon: Info
    }
  };

  const currentStyle = styles[variant];
  const Icon = IconOverride || currentStyle.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center border-2 mb-4 shadow-lg ${currentStyle.iconBg}`}>
            <Icon className="w-8 h-8" />
          </div>
          
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
            {title}
          </h3>
          
          <p className="text-gray-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors border border-gray-700"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-3 px-4 font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${currentStyle.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
