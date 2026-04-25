import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Terminal, 
  Key, 
  UserPlus, 
  Database, 
  Wifi, 
  AlertTriangle, 
  ShieldCheck,
  X,
  Loader2
} from 'lucide-react';
import { Card, Button } from './ui-components';
import { api } from '../lib/api';
import { toast } from 'sonner';

interface HealthData {
  status: string;
  latency: string;
  database: string;
  timestamp: string;
}

interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  module: string;
  message: string;
  created_at: string;
}

export const GlobalPlatformSettings = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const fetchData = async () => {
    try {
      const [healthData, logsData] = await Promise.all([
        api.get('/saas/health'),
        api.get('/saas/logs')
      ]);
      setHealth(healthData);
      setLogs(logsData || []);
    } catch (error) {
      toast.error('Error al sincronizar datos');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-12 animate-slide-up pb-20">
      
      {/* 1. ESTADO DE SALUD DEL SISTEMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <HealthCard 
          icon={Wifi} 
          label="LATENCIA" 
          value={health?.latency || '--'} 
          status={health?.status === 'operational' ? 'success' : 'error'}
          description="Respuesta del Microservicio Central."
        />
        <HealthCard 
          icon={Database} 
          label="PERSISTENCIA" 
          value={health?.database === 'connected' ? 'ONLINE' : 'OFFLINE'} 
          status={health?.database === 'connected' ? 'success' : 'error'}
          description="Vínculo con el Clúster Supabase."
        />
        <div className="bg-brand-500 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-brand-500/20 flex flex-col justify-between relative overflow-hidden group border border-brand-400/30">
          <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-white/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-xl border border-white/20">
              <ShieldCheck className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <h4 className="font-black text-xl font-outfit uppercase tracking-tight leading-none">INFRAESTRUCTURA <br/>PROTEGIDA</h4>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-3">Protección de Capa Global activa.</p>
          </div>
          <button 
            onClick={() => setShowAdminModal(true)}
            className="mt-8 w-full bg-white text-brand-600 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 relative z-10"
          >
            <UserPlus className="h-4 w-4" strokeWidth={3} />
            GESTIONAR AUTORIDADES
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 2. VISOR DE LOGS - MODO ADAPTATIVO */}
        <Card className="lg:col-span-8 p-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="p-8 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-white/[0.02]">
            <div className="space-y-1">
              <h3 className="font-black text-sm flex items-center gap-3 text-zinc-900 dark:text-white uppercase tracking-tight font-outfit">
                <Terminal className="h-5 w-5 text-brand-500" />
                CONSOLA DE EVENTOS
              </h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em]">Monitoreo en Tiempo Real</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
               <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">LIVE</span>
            </div>
          </div>
          <div className="h-[500px] overflow-y-auto bg-zinc-950 font-mono text-[11px] p-8 space-y-2 scrollbar-hide">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <Activity className="h-12 w-12 mb-4 animate-pulse text-zinc-500" />
                <p className="font-black uppercase tracking-[0.5em] text-zinc-500">No se detectan pulsaciones...</p>
              </div>
            ) : (
              logs.map(log => <LogLine key={log.id} log={log} />)
            )}
          </div>
        </Card>

        {/* 3. GESTIÓN DE ACCESOS */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden backdrop-blur-xl">
             <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none" />
            <h3 className="font-black text-xs mb-8 flex items-center gap-3 text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.2em]">
              <Key className="h-4 w-4 text-amber-500" />
              ACCESOS
            </h3>
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 p-8 rounded-3xl flex flex-col items-center justify-center text-center py-10">
                <div className="h-16 w-16 bg-white dark:bg-white/[0.02] rounded-full flex items-center justify-center mb-6 border border-zinc-200 dark:border-white/5">
                  <ShieldAlert className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                </div>
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest leading-relaxed">No hay integraciones activas.</p>
              </div>
              <Button disabled variant="outline" className="w-full h-14 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border-zinc-200 dark:border-white/10 opacity-30">
                VINCULAR ENDPOINT
              </Button>
            </div>
          </Card>

          <Card className="p-8 border-brand-500/10 bg-brand-500/[0.02] rounded-[2.5rem] shadow-2xl border">
            <div className="flex items-start gap-6">
              <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20 text-brand-500">
                <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div className="space-y-4">
                <h4 className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-tight">MANTENIMIENTO</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed leading-none">
                  SUSPRESIÓN TOTAL DE ACCESO A LA RED SaaS.
                </p>
                <button className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] hover:text-brand-400 transition-colors border-b border-brand-500/30 pb-1">
                  CALENDARIZAR APAGÓN
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showAdminModal && <SuperAdminModal onClose={() => setShowAdminModal(false)} />}
    </div>
  );
};

const HealthCard = ({ icon: Icon, label, value, status, description }: any) => (
  <Card className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col justify-between group hover:border-brand-500/20 transition-all backdrop-blur-xl">
    <div className="flex items-center justify-between mb-8">
      <div className="h-14 w-14 bg-zinc-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-white/10 group-hover:bg-brand-500/10 group-hover:text-brand-500 group-hover:border-brand-500/20 transition-all">
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div className="flex items-center gap-3">
         <span className={`h-3 w-3 rounded-full ${status === 'success' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'}`}></span>
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] mb-2">{label}</p>
      <h3 className="text-3xl font-black text-zinc-900 dark:text-white font-outfit tracking-tighter">{value}</h3>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-4 font-bold uppercase tracking-widest">{description}</p>
    </div>
  </Card>
);

const LogLine = ({ log }: { log: LogEntry }) => {
  const color = log.level === 'error' || log.level === 'critical' ? 'text-red-500' : log.level === 'warning' ? 'text-amber-500' : 'text-zinc-500';
  
  return (
    <div className={`flex items-start gap-4 p-2 rounded-lg hover:bg-white/[0.05] transition-colors group`}>
      <span className="text-zinc-600 min-w-[80px] font-black">[{new Date(log.created_at).toLocaleTimeString()}]</span>
      <span className={`font-black uppercase min-w-[70px] ${color}`}>[{log.level}]</span>
      <span className="text-brand-500/30 min-w-[80px] uppercase font-black">[{log.module}]</span>
      <span className="text-zinc-400 group-hover:text-white transition-colors font-bold uppercase tracking-tight">{log.message}</span>
    </div>
  );
};

const SuperAdminModal = ({ onClose }: { onClose: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { await api.post('/saas/super-admins', formData); toast.success('Autoridad Consolidada'); onClose(); } catch (error: any) { toast.error('Error de Privilegios'); } finally { setLoading(false); } };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
      <Card className="w-full max-w-lg p-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden rounded-[3rem]">
        <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="absolute top-8 right-8">
          <button onClick={onClose} className="p-3 bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center mb-10 relative z-10">
          <div className="h-20 w-20 bg-brand-500/10 rounded-[2rem] flex items-center justify-center text-brand-500 mb-6 border border-brand-500/20">
            <UserPlus size={40} strokeWidth={2.5} />
          </div>
          <h3 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter font-outfit">PRIVILEGIOS</h3>
          <p className="text-[10px] text-zinc-500 mt-3 font-bold uppercase tracking-[0.3em]">Asignación de Super Administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-2">Identidad</label>
             <input type="text" placeholder="Nombre Completo" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required className="w-full h-14 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-brand-500 transition-all text-zinc-900 dark:text-white outline-none" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-2">Email</label>
             <input type="email" placeholder="admin@master.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="w-full h-14 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-brand-500 transition-all text-zinc-900 dark:text-white outline-none" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-2">Contraseña</label>
             <input type="password" placeholder="••••••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required className="w-full h-14 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-brand-500 transition-all text-zinc-900 dark:text-white outline-none" />
          </div>
          
          <div className="bg-red-500/5 dark:bg-red-500/10 p-6 rounded-3xl border border-red-500/20 flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-1" strokeWidth={2.5} />
            <p className="text-[9px] text-red-600 dark:text-red-400 leading-relaxed font-black uppercase">ACCESO TOTAL AL NÚCLEO. RESTRINGIDO.</p>
          </div>

          <Button type="submit" className="w-full h-16 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-brand-500/20">
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'CONSOLIDAR IDENTIDAD'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
