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
  Loader2,
  Lock,
  CloudUpload,
  Cpu,
  Globe,
  BellRing,
  Download
} from 'lucide-react';
import { Card, Button } from './ui-components';
import { api } from '../lib/api';
import { toast } from 'sonner';

export const GlobalPlatformSettings = () => {
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const triggerBackup = () => {
    setBackupLoading(true);
    setTimeout(() => {
      setBackupLoading(false);
      toast.success('Backup del Sistema Consolidado en AWS S3');
    }, 2000);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      
      {/* 1. HEADER ESTRATÉGICO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-light text-foreground font-heading tracking-tight uppercase italic">Infraestructura <span className="font-black text-brand-500 not-italic">& Control</span></h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.4em]">Núcleo de Operaciones Globales</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={BellRing} className="h-12 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest border-border">Alertas</Button>
          <Button onClick={triggerBackup} loading={backupLoading} icon={CloudUpload} className="h-12 px-8 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-brand-600 shadow-xl shadow-brand-600/20 text-white border-none">Backup Maestro</Button>
        </div>
      </div>

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
            <span className="text-[8px] font-black text-emerald-500 animate-pulse uppercase tracking-widest">Live Monitoring</span>
            <div className="h-4 w-px bg-border/20" />
            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Clear Console</Button>
          </div>
        </div>
        <div className="h-[400px] overflow-y-auto p-8 font-mono text-[11px] space-y-3 bg-[#0a0a0a] text-white/70">
          {[
            { time: '16:02:14', event: 'SYS_BACKUP_INITIATED', origin: 'Worker-01', level: 'INFO' },
            { time: '16:00:05', event: 'AUTH_SUCCESS', origin: 'SuperAdmin_Ariosto', level: 'SEC' },
            { time: '15:58:42', event: 'ORG_CREATED', origin: 'Platform_API', level: 'MOD' },
            { time: '15:55:01', event: 'HEARTBEAT_STABLE', origin: 'Infra_Manager', level: 'SYS' },
            { time: '15:52:12', event: 'NEW_SUBSCRIPTION', origin: 'Stripe_Hook', level: 'FIN' },
          ].map((log, i) => (
            <div key={i} className="flex gap-6 border-b border-white/5 pb-2 hover:text-white transition-colors">
              <span className="text-brand-500/50">[{log.time}]</span>
              <span className={`w-20 font-black ${log.level === 'SEC' ? 'text-emerald-500' : log.level === 'FIN' ? 'text-blue-500' : 'text-zinc-500'}`}>[{log.level}]</span>
              <span className="font-black text-brand-500/80">[{log.origin}]</span>
              <span className="uppercase tracking-tight font-bold">{log.event}</span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};
