import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Component stack:', error, errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleLogout = () => {
    localStorage.removeItem('gkad_token');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full min-h-[60vh] p-12 text-center bg-card border border-border rounded-[3rem] backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="h-24 w-24 bg-amber-500/10 text-amber-500 rounded-[2.5rem] flex items-center justify-center border border-amber-500/20 mb-8 shadow-inner">
            <AlertTriangle className="h-12 w-12"/>
          </div>
          <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-3">
            Interrupción Visual Detectada
          </h3>
          <p className="text-[11px] text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed font-bold uppercase tracking-widest opacity-70">
            {this.props.fallbackMessage || 'El componente no pudo renderizarse debido a una inconsistencia de datos temporales.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-8 py-4 bg-brand-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-500/20 active:scale-95"
            >
              <RefreshCcw size={14} /> Reintentar Carga
            </button>
            <button
              onClick={this.handleLogout}
              className="flex items-center gap-2 px-8 py-4 bg-muted text-muted-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 border border-border"
            >
              Cerrar Sesión Segura
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
