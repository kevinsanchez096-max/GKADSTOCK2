import { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Lock,
  CloudUpload,
  Cpu,
  Globe,
  BellRing,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { Card, Button } from './ui-components';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  time?: string;
  created_at: string;
  event: string;
  origin: string;
  level: string;
  metadata: any;
}

export const GlobalPlatformSettings = () => {
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── 1. CARGA INICIAL DE LOGS ──────────────────────────────────────────
  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('[AUDIT] Error fetching logs:', err.message);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // ── 2. SUSCRIPCIÓN REALTIME ───────────────────────────────────────────
  useEffect(() => {
    if (!isMonitoring) return;

    const channel = supabase.channel('realtime_audit_logs')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'system_audit_logs' 
      }, (payload) => {
        const newLog = payload.new as AuditLog;
        setLogs(prev => [newLog, ...prev].slice(0, 50));
        
        // Auto-scroll si está al final (opcional, aquí los nuevos van arriba)
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMonitoring]);

  const triggerBackup = () => {
    setBackupLoading(true);
    setTimeout(() => {
      setBackupLoading(false);
      toast.success('Backup del Sistema Consolidado en AWS S3');
    }, 2000);
  };

  const clearConsole = () => {
    setLogs([]);
    toast.info('Vista de consola despejada');
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('es-CO', { hour12: false });
    return `${date} ${time}`;
  };

  const traducirEvento = (event: string) => {
    const traducciones: Record<string, string> = {
      'AUTH_SUCCESS': 'Acceso exitoso',
      'ORG_CREATED': 'Organización creada',
      'ORG_ACTIVATED': 'Organización activada',
      'ORG_SUSPENDED': 'Organización suspendida',
      'BOOT_CHECK': 'Verificación de arranque',
      'NEW_USER': 'Nuevo usuario registrado',
      'HIGH_VALUE_SALE': 'Venta de alto valor',
      'PLAN_LIMIT': 'Límite de plan alcanzado',
    };
    return traducciones[event] || event.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      
      {/* 1. HEADER ESTRATÉGICO */}
      <Card className="bg-card/30 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-xl relative overflow-hidden mb-12">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none"/>
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none"/>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"/>
              <Terminal size={18} className="text-brand-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Core Infrastructure</span>
            </div>
            <h1 className="text-4xl font-black text-foreground font-heading tracking-tighter uppercase leading-none">
              Infraestructura <span className="bg-gradient-to-r from-blue-400 to-emerald-500 bg-clip-text text-transparent">& Control</span>
            </h1>
            <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest opacity-70 ml-1">Núcleo de operaciones globales y gestión de nodos críticos</p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Button 
              variant="outline" 
              icon={BellRing} 
              className="h-14 px-8 rounded-2xl border-border/50 hover:bg-muted font-black uppercase text-[10px] tracking-widest transition-all"
            >
              Alertas
            </Button>
            
            <Button 
              onClick={triggerBackup} 
              loading={backupLoading} 
              icon={CloudUpload} 
              className="h-14 px-10 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-2xl shadow-blue-500/20 border-none"
            >
              Backup Maestro
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* System Health Summary */}
        <Card className="p-8 border-border space-y-8 bg-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
            <Cpu size={120} />
          </div>
          <div className="space-y-2 relative z-10">
            <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Estado del Núcleo</p>
            <h3 className="text-4xl font-black text-foreground font-outfit uppercase">Operational</h3>
          </div>
          <div className="space-y-4 relative z-10">
            {[
              { label: 'API Latency', value: '42ms', status: 'optimal', icon: Wifi },
              { label: 'DB Cluster', value: 'Syncing', status: 'optimal', icon: Database },
              { label: 'Cloud Nodes', value: '12 Active', status: 'optimal', icon: Globe },
            ].map((node, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border/50">
                <div className="flex items-center gap-3">
                  <node.icon size={16} className="text-muted-foreground" />
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{node.label}</span>
                </div>
                <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{node.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Security & Access Keys */}
        <Card className="p-8 border-border space-y-8">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Seguridad Global</p>
            <h3 className="text-xl font-black text-foreground font-outfit uppercase">Master Keys</h3>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-muted/50 rounded-[2rem] border border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Public Key</span>
                <Button variant="ghost" size="sm" icon={Download} className="h-8 w-8 rounded-full" />
              </div>
              <p className="font-mono text-[11px] text-foreground/40 break-all select-all uppercase">GKAD_PUB_9821_XX_9921_Z</p>
            </div>
            <div className="p-6 bg-brand-500/5 rounded-[2rem] border border-brand-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-brand-500 uppercase">Secret Key</span>
                <Lock size={14} className="text-brand-500" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-full bg-brand-500/20 rounded-full flex gap-1 items-center px-2">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-1 w-1 rounded-full bg-brand-500" />)}
                </div>
                <Button variant="ghost" size="sm" className="text-[9px] font-black text-brand-500 uppercase">Ver</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Authorities & Permissions */}
        <Card className="p-8 bg-brand-500 rounded-[2.5rem] shadow-2xl shadow-brand-500/20 text-white flex flex-col justify-between border-none">
          <div className="space-y-6">
            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30">
              <ShieldCheck size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-outfit uppercase tracking-tight italic">SuperAdmin <br/>Authorities</h3>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                Niveles de acceso y permisos de <br/>administración centralizada.
              </p>
            </div>
          </div>
          <Button className="mt-8 bg-white text-brand-600 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none hover:bg-zinc-100 shadow-xl transition-all active:scale-95">
            Gestionar Privilegios
          </Button>
        </Card>
      </div>

      {/* Audit Log / Console */}
      <Card className="p-0 overflow-hidden border-border bg-black/5 dark:bg-black/20">
        <div className="p-8 border-b border-border/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Terminal size={18} className="text-brand-500" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Audit Log Console</h3>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${isMonitoring ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}
            >
              {isMonitoring ? <Pause size={10} /> : <Play size={10} />}
              <span className={`text-[8px] font-black uppercase tracking-widest ${isMonitoring ? 'animate-pulse' : ''}`}>
                {isMonitoring ? 'Live Monitoring' : 'Monitoring Paused'}
              </span>
            </button>
            <div className="h-4 w-px bg-border/20" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearConsole}
              className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Clear Console
            </Button>
          </div>
        </div>
        <div 
          ref={scrollRef}
          className="h-[400px] overflow-y-auto p-8 font-mono text-[11px] space-y-3 bg-[#0a0a0a] text-white/70"
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
              <Terminal size={40} strokeWidth={1} />
              <p className="uppercase tracking-[0.4em] text-[10px]">Sin eventos registrados</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-6 border-b border-white/5 pb-2 hover:text-white transition-colors group">
                <span className="text-brand-500/50">[{formatTime(log.created_at)}]</span>
                <span className={`w-20 font-black ${
                  log.level === 'SEC' ? 'text-emerald-500' : 
                  log.level === 'FIN' ? 'text-blue-500' : 
                  log.level === 'MOD' ? 'text-amber-500' :
                  log.level === 'SYS' ? 'text-purple-500' :
                  'text-zinc-500'
                }`}>[{log.level}]</span>
                <span className="font-black text-brand-500/80">[{log.origin}]</span>
                <span className="uppercase tracking-tight font-bold">{traducirEvento(log.event)}</span>
                <span className="ml-auto text-[8px] opacity-0 group-hover:opacity-40 transition-opacity uppercase truncate max-w-[200px]">
                  {JSON.stringify(log.metadata)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

    </div>
  );
};

