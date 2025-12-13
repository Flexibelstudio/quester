import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  }

  private handleGoHome = () => {
    window.location.href = '/';
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-3xl p-8 shadow-2xl">
            <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black text-white mb-2">Något gick snett</h1>
            <p className="text-slate-400 text-sm mb-6">
              En oväntad bugg uppstod. Vårt team har (teoretiskt) blivit notifierade.
            </p>
            
            {this.state.error && (
              <div className="bg-black/50 p-4 rounded-xl text-left mb-6 overflow-hidden">
                <code className="text-xs text-red-300 font-mono break-all">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={this.handleGoHome}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> Hem
              </button>
              <button 
                onClick={this.handleReload}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
              >
                <RotateCcw className="w-4 h-4" /> Ladda om
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}