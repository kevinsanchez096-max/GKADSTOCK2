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

 public render() {
 if (this.state.hasError) {
 return (
 <div className="flex flex-col items-center justify-center w-full min-h-[50vh] p-8 text-center bg-card border border-border rounded-3xl backdrop-blur-xl">
 <div className="h-20 w-20 bg-amber-500/10 text-amber-500 rounded-[2rem] flex items-center justify-center border border-amber-500/20 mb-6">
 <AlertTriangle className="h-10 w-10"/>
 </div>
 <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">
 Interrupción Visual Detectada
 </h3>
 <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
 {this.props.fallbackMessage || 'El componente no pudo renderizarse debido a una inconsistencia de datos temporales.'}
 </p>
 <button
 onClick={this.handleRetry}
 className="flex items-center gap-2 px-6 py-3 bg-background text-foreground dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
 >
 <RefreshCcw size={14} /> Reintentar Carga
 </button>
 </div>
 );
 }

 return this.props.children;
 }
}
