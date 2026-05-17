import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui-components';
import { 
    Wallet, 
    Plus, 
    TrendingUp, 
    TrendingDown, 
    CreditCard, 
    Clock, 
    User, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle,
    Calendar,
    ArrowDownRight,
    RefreshCw,
    ShieldCheck,
    Trash2
} from 'lucide-react';
import { useCashStore } from '../store/useCashStore';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

export const CashRegister = () => {
    const { 
        activeSession, 
        history, 
        loading, 
        fetchActiveSession, 
        openSession, 
        closeSession, 
        fetchHistory,
        deleteSession
    } = useCashStore();

    const { profile } = useAuthStore();

    // Inputs de formularios
    const [openingBalance, setOpeningBalance] = useState('');
    const [actualCash, setActualCash] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchActiveSession();
        fetchHistory();
    }, []);

    const handleOpen = async (e: React.FormEvent) => {
        e.preventDefault();
        const base = Number(openingBalance);
        if (isNaN(base) || base < 0) {
            toast.error('Debe ingresar un monto base inicial positivo.');
            return;
        }
        const success = await openSession(base);
        if (success) {
            setOpeningBalance('');
        }
    };

    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        const realAmount = Number(actualCash);
        if (isNaN(realAmount) || realAmount < 0) {
            toast.error('Debe ingresar el dinero físico real que contó.');
            return;
        }
        const success = await closeSession(realAmount, notes);
        if (success) {
            setActualCash('');
            setNotes('');
        }
    };

    // Cálculos rápidos para vista del panel activo
    const salesCash = activeSession?.sales_cash || 0;
    const salesOther = activeSession?.sales_other || 0;
    const totalExpenses = activeSession?.total_expenses || 0;
    const openingBase = activeSession?.opening_balance || 0;
    const expectedTotal = openingBase + salesCash - totalExpenses;

    // Cálculo dinámico de arqueo
    const realAmountVal = Number(actualCash) || 0;
    const differenceVal = actualCash !== '' ? realAmountVal - expectedTotal : 0;

    return (
        <div className="space-y-8 animate-slide-up flex-1 min-h-full flex flex-col">
            
            {/* 1. MISSION CONTROL HEADER */}
            <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-4">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"/>
                <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none"/>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full animate-pulse shadow-lg ${
                                activeSession ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'
                            }`}/>
                            <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${
                                activeSession ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                                {activeSession ? 'Caja Abierta y Activa' : 'Caja Cerrada'}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
                            Control de <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Caja</span>
                        </h1>
                        <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">
                            Apertura, Arqueo e Historial de Ventas
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                fetchActiveSession();
                                fetchHistory();
                                toast.success('Datos de caja sincronizados');
                            }}
                            className="h-12 w-12 rounded-xl bg-muted border border-border/60 hover:bg-muted-hover flex items-center justify-center transition-all text-muted-foreground"
                            title="Recargar datos"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </Card>

            {loading && !activeSession && history.length === 0 ? (
                <Card className="p-32 text-center text-muted-foreground font-black uppercase tracking-widest text-xs animate-pulse">
                    Cargando Módulo de Caja...
                </Card>
            ) : !activeSession ? (
                /* ── FORMULARIO DE APERTURA DE CAJA ── */
                <div className="flex justify-center items-center py-8">
                    <Card className="max-w-5xl w-full p-0 bg-card border border-border shadow-2xl rounded-[3rem] relative overflow-hidden flex flex-col md:flex-row">
                        {/* LADO IZQUIERDO - INFORMACIÓN Y BRANDING */}
                        <div className="md:w-1/2 p-12 bg-emerald-500/5 relative overflow-hidden flex flex-col justify-center border-r border-border/50">
                            <div className="absolute top-[-20%] left-[-20%] w-80 h-80 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"/>
                            <div className="absolute bottom-[-10%] right-[-10%] font-black text-[120px] text-emerald-500/5 pointer-events-none select-none font-outfit">POS</div>
                            
                            <div className="relative z-10 space-y-6">
                                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-xl shadow-emerald-500/10">
                                    <Wallet size={32} />
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-foreground uppercase tracking-tight leading-none">Apertura<br/>de Caja</h3>
                                    <p className="text-sm font-bold text-muted-foreground mt-4 leading-relaxed max-w-sm">
                                        Para comenzar a facturar y registrar movimientos en el terminal POS, es obligatorio realizar la apertura indicando el efectivo de base con el que inicia en caja física.
                                    </p>
                                </div>
                                <div className="pt-8 grid grid-cols-2 gap-4">
                                    <div className="bg-background/80 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2 text-emerald-500">
                                            <ShieldCheck size={18} />
                                            <h4 className="text-[10px] uppercase font-black tracking-widest">Seguro</h4>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-bold">Registro blindado</p>
                                    </div>
                                    <div className="bg-background/80 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2 text-blue-500">
                                            <Clock size={18} />
                                            <h4 className="text-[10px] uppercase font-black tracking-widest">Auto-Cierre</h4>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-bold">11:59 PM diario</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LADO DERECHO - FORMULARIO INTERACTIVO */}
                        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-card/50 backdrop-blur-xl relative z-10">
                            <form onSubmit={handleOpen} className="space-y-8 w-full max-w-sm mx-auto">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-foreground uppercase tracking-[0.2em] ml-1">
                                        Dinero Base de Apertura ($)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground/50 font-outfit">$</span>
                                        <input 
                                            type="number"
                                            placeholder="100000"
                                            value={openingBalance}
                                            onChange={e => setOpeningBalance(e.target.value)}
                                            required
                                            min="0"
                                            className="w-full h-16 bg-background border border-border rounded-2xl pl-10 pr-4 text-3xl font-black text-emerald-500 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-muted-foreground/30 font-outfit shadow-inner transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground/70 ml-1">
                                        Ingrese el monto exacto disponible en la gaveta.
                                    </p>
                                </div>
                                <Button 
                                    type="submit"
                                    className="w-full h-16 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black uppercase text-[11px] tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 border-none rounded-2xl"
                                >
                                    ABRIR CAJA E INICIAR TURNO
                                </Button>
                            </form>
                        </div>
                    </Card>
                </div>
            ) : (
                /* ── PANEL DE MONITOREO Y ARQUEO ACTIVO ── */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* MONITOREO DE CAJA */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="p-8 bg-card border border-border/60 shadow-xl rounded-[2.5rem] relative overflow-hidden">
                            <div className="absolute right-[-5%] top-[-5%] text-emerald-500/[0.03] font-black text-[150px] pointer-events-none select-none font-outfit">ACTIVE</div>
                            
                            <h3 className="text-lg font-black uppercase text-foreground tracking-tight border-b border-border/50 pb-4 mb-6 flex items-center gap-3">
                                <Clock size={18} className="text-emerald-500" /> Resumen de Sesión Activa
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 bg-muted/40 rounded-2xl border border-border/50 flex flex-col justify-between">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Base Inicial</span>
                                    <span className="text-2xl font-black text-foreground font-outfit mt-2">${openingBase.toLocaleString()}</span>
                                </div>

                                <div className="p-5 bg-emerald-500/[0.04] rounded-2xl border border-emerald-500/10 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Ventas Efectivo</span>
                                        <TrendingUp size={14} className="text-emerald-500" />
                                    </div>
                                    <span className="text-2xl font-black text-emerald-500 font-outfit mt-2">+${salesCash.toLocaleString()}</span>
                                </div>

                                <div className="p-5 bg-blue-500/[0.04] rounded-2xl border border-blue-500/10 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Ventas Otros Medios</span>
                                        <CreditCard size={14} className="text-blue-500" />
                                    </div>
                                    <span className="text-2xl font-black text-blue-500 font-outfit mt-2">+${salesOther.toLocaleString()}</span>
                                </div>

                                <div className="p-5 bg-rose-500/[0.04] rounded-2xl border border-rose-500/10 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Egresos / Gastos</span>
                                        <TrendingDown size={14} className="text-rose-500" />
                                    </div>
                                    <span className="text-2xl font-black text-rose-500 font-outfit mt-2">-${totalExpenses.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* TOTAL ESPERADO GLOW */}
                            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Efectivo Esperado en Caja</h4>
                                    <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">
                                        (Base Inicial + Ventas Efectivo - Egresos)
                                    </p>
                                </div>
                                <span className="text-3xl font-black text-emerald-500 font-outfit tracking-tighter">
                                    ${expectedTotal.toLocaleString()}
                                </span>
                            </div>

                            {/* METADATOS APERTURA */}
                            <div className="mt-6 flex flex-col md:flex-row justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest gap-2 bg-muted/30 p-4 rounded-xl">
                                <span className="flex items-center gap-1.5"><User size={12} /> Responsable: {activeSession?.user_name}</span>
                                <span className="flex items-center gap-1.5"><Clock size={12} /> Abierta el: {new Date(activeSession?.opening_time).toLocaleString()}</span>
                            </div>
                        </Card>
                    </div>

                    {/* ARQUEO Y CIERRE FORMULARIO */}
                    <div className="lg:col-span-5">
                        <Card className="p-8 bg-card border border-border/60 shadow-2xl rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between h-full">
                            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full pointer-events-none"/>

                            <div>
                                <h3 className="text-lg font-black uppercase text-foreground tracking-tight border-b border-border/50 pb-4 mb-6 flex items-center gap-3">
                                    <TrendingDown size={18} className="text-rose-500" /> Realizar Arqueo y Cierre
                                </h3>

                                <form onSubmit={handleClose} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                                            Dinero Físico Real Contado ($)
                                        </label>
                                        <input 
                                            type="number"
                                            placeholder="Contar efectivo y escribir..."
                                            value={actualCash}
                                            onChange={e => setActualCash(e.target.value)}
                                            required
                                            min="0"
                                            className="w-full h-12 bg-muted border border-border rounded-xl px-4 text-xl font-black text-rose-500 focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-muted-foreground/40 font-outfit shadow-inner"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                                            Observaciones del Turno (Opcional)
                                        </label>
                                        <textarea 
                                            placeholder="Ej. Todo cuadrado, faltaron vueltas..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            rows={2}
                                            className="w-full bg-muted border border-border rounded-xl p-4 text-xs font-bold text-foreground focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-muted-foreground/40"
                                        />
                                    </div>

                                    {/* DOCK CALCULADORA DE ARQUEO EN TIEMPO REAL */}
                                    {actualCash !== '' && (
                                        <div className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-2 ${
                                            differenceVal === 0 
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                                                : differenceVal > 0 
                                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                                                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                        }`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[9px] font-black uppercase tracking-widest">Resultado del Arqueo</span>
                                                {differenceVal === 0 ? (
                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider"><CheckCircle2 size={12} /> Caja Perfecta</span>
                                                ) : differenceVal > 0 ? (
                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider"><AlertTriangle size={12} /> Sobrante</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider"><XCircle size={12} /> Faltante</span>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-baseline">
                                                <span className="text-xs font-bold opacity-80">Diferencia:</span>
                                                <span className="text-2xl font-black font-outfit">
                                                    {differenceVal >= 0 ? '+' : ''}${differenceVal.toLocaleString()}
                                                </span>
                                            </div>

                                            <p className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-wider text-center">
                                                {differenceVal === 0 
                                                    ? '¡Excelente! Los saldos contables coinciden con el efectivo físico.' 
                                                    : differenceVal > 0 
                                                    ? 'Cuidado: Hay más efectivo del esperado en la caja física.' 
                                                    : 'Alerta: Hace falta efectivo en la caja física respecto a las ventas.'}
                                            </p>
                                        </div>
                                    )}

                                    <Button 
                                        type="submit"
                                        className="w-full h-12 bg-gradient-to-r from-rose-500 to-red-500 text-white font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-rose-500/20 border-none rounded-xl"
                                    >
                                        CONSOLIDAR ARQUEO Y CERRAR CAJA
                                    </Button>
                                </form>
                            </div>
                        </Card>
                    </div>

                </div>
            )}

            {/* TABLA DE HISTORIAL DE ARQUEOS */}
            <Card className="p-0 bg-card border border-border shadow-md dark:shadow-none overflow-hidden rounded-[2.5rem] flex-1 flex flex-col backdrop-blur-xl">
                <div className="p-8 border-b border-border/60 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black uppercase text-foreground tracking-tight">Historial de Cierres de Caja</h3>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Sesiones Completadas</p>
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] border-b border-border">
                                <th className="px-6 py-5">Fecha / Turno</th>
                                <th className="px-6 py-5">Cajero</th>
                                <th className="px-6 py-5 text-right">Base</th>
                                <th className="px-6 py-5 text-right">Vtas Efectivo</th>
                                <th className="px-6 py-5 text-right">Otros Medios</th>
                                <th className="px-6 py-5 text-right">Gastos</th>
                                <th className="px-6 py-5 text-right">Esperado</th>
                                <th className="px-6 py-5 text-right">Entregado</th>
                                <th className="px-6 py-5 text-right">Diferencia</th>
                                <th className="px-6 py-5 text-center">Estado</th>
                                <th className="px-6 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-20 text-foreground">
                                        <div className="flex flex-col items-center opacity-30">
                                            <Wallet className="h-12 w-12 mb-3" strokeWidth={1} />
                                            <p className="font-black uppercase tracking-[0.4em] text-[10px]">No se registran cajas cerradas</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((s) => {
                                    const diff = s.difference || 0;
                                    return (
                                        <tr key={s.id} className="hover:bg-muted/30 transition-colors text-xs font-bold">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-foreground uppercase tracking-tight">
                                                        {new Date(s.closing_time || '').toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                                                        {new Date(s.opening_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.closing_time || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-muted-foreground uppercase text-[10px] tracking-wider">
                                                {s.user_name}
                                            </td>
                                            <td className="px-6 py-5 text-right font-outfit text-foreground/80 font-black">
                                                ${s.opening_balance.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right font-outfit text-emerald-500 font-black">
                                                +${s.sales_cash.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right font-outfit text-blue-500 font-black">
                                                +${s.sales_other.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right font-outfit text-rose-500 font-black">
                                                -${s.total_expenses.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right font-outfit text-foreground/90 font-black">
                                                ${s.expected_cash.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right font-outfit text-foreground font-black">
                                                ${(s.actual_cash || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                {diff === 0 ? (
                                                    <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Cuadrada</span>
                                                ) : (
                                                    <span className={`text-[10px] font-black font-outfit ${diff > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center whitespace-nowrap">
                                                {s.auto_closed ? (
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20" title="Sesión de día anterior cerrada automáticamente">
                                                        Auto-Cierre
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                        Manual
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('¿Está seguro de que desea eliminar este reporte de cierre de caja permanentemente? Esta acción es irreversible.')) {
                                                            deleteSession(s.id);
                                                        }
                                                    }}
                                                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all hover:scale-105 border border-rose-500/20 cursor-pointer"
                                                    title="Eliminar reporte"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-border bg-muted text-center shrink-0">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.5em]">CERTIFICACIÓN DE ARQUEOS GKAD CLOUD V4</p>
                </div>
            </Card>

        </div>
    );
};
export default CashRegister;
