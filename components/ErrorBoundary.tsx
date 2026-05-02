import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-500/50 pulse-indicator">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">Estabilidade Industrial</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Detectamos um problema inesperado na interface, mas seus dados locais continuam seguros.
              </p>
            </div>

            <div className="bg-black/40 rounded-xl p-4 border border-slate-800/50">
               <p className="text-[10px] text-slate-500 font-mono break-words line-clamp-2 italic">
                 {this.state.error?.message || 'Erro de execução desconhecido'}
               </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full bg-lime-600 hover:bg-lime-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(132,204,22,0.3)] active:scale-95 uppercase text-sm tracking-widest"
            >
              Reiniciar Sistema
            </button>

            <p className="text-slate-600 text-[10px] uppercase font-bold tracking-tighter">
              MONTANHA GESTÃO &copy; 2026
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
