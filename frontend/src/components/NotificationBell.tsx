import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ZapOff,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface SystemNotification {
  id: string;
  created_at: string;
  type: 'NEW_USER' | 'ORG_STATUS' | 'HIGH_VALUE_SALE' | 'SYSTEM_ERROR' | 'PLAN_LIMIT' | 'ORG_CREATED' | 'ORG_DELETED';
  title: string;
  message: string;
  read: boolean;
  metadata: any;
}

export const NotificationBell = () => {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = useRef<any>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchNotifications = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;

      if (data) {
        setNotifications(data);
        const unread = data.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('[Notifications] Error fetching:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    fetchNotifications();

    // Configuración de Realtime con mayor estabilidad
    const channelName = `system-alerts-${profile?.id || 'guest'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_notifications' },
        (payload) => {
          const newNotification = payload.new as SystemNotification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          
          // Toast elegante para notificaciones críticas
          if (newNotification.type === 'SYSTEM_ERROR' || newNotification.type === 'PLAN_LIMIT') {
            toast.error(newNotification.title, {
              description: newNotification.message,
              icon: <ShieldAlert className="text-red-500" />
            });
          } else if (newNotification.type === 'ORG_CREATED' || newNotification.type === 'ORG_DELETED') {
            toast.info(newNotification.title, {
              description: newNotification.message,
              icon: newNotification.type === 'ORG_CREATED' ? <CheckCircle2 className="text-emerald-500" /> : <Trash2 size={16} className="text-red-500" />
            });
          }

          if (Notification.permission === 'granted') {
             new Notification(`GKAD ALERTA: ${newNotification.title}`, {
               body: newNotification.message,
               icon: '/logo.png'
             });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isSuperAdmin, profile?.id]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    const { error } = await supabase
      .from('system_notifications')
      .update({ read: true })
      .eq('read', false);

    if (!error) {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_USER': return <UserPlus size={16} className="text-brand-500" />;
      case 'HIGH_VALUE_SALE': return <TrendingUp size={16} className="text-emerald-500" />;
      case 'ORG_STATUS': return <ZapOff size={16} className="text-amber-500" />;
      case 'PLAN_LIMIT': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'SYSTEM_ERROR': return <AlertCircle size={16} className="text-red-500" />;
      case 'ORG_CREATED': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'ORG_DELETED': return <Trash2 size={16} className="text-red-500" />;
      default: return <ShieldAlert size={16} className="text-brand-500" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'NEW_USER': return 'Nuevo Registro';
      case 'HIGH_VALUE_SALE': return 'Venta VIP';
      case 'ORG_STATUS': return 'Infraestructura';
      case 'PLAN_LIMIT': return 'Límite de Plan';
      case 'SYSTEM_ERROR': return 'Fallo Crítico';
      case 'ORG_CREATED': return 'Nueva Empresa';
      case 'ORG_DELETED': return 'Baja de Empresa';
      default: return 'Alerta';
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) markAllAsRead();
        }}
        className={`relative p-2.5 bg-muted/50 backdrop-blur-md text-muted-foreground hover:text-brand-500 hover:bg-card border border-border/50 rounded-xl transition-all shadow-sm group ${isOpen ? 'ring-2 ring-brand-500/20 bg-card text-brand-500' : ''}`}
        title="Centro de Control Global"
      >
        <Bell size={18} className={`${unreadCount > 0 ? "animate-pulse text-brand-500" : ""} group-hover:scale-110 transition-transform`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-background shadow-lg shadow-red-500/50 animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-85 bg-card/95 backdrop-blur-xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] overflow-hidden z-[100] animate-in slide-in-from-top-4 duration-300 origin-top-right">
          <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 text-foreground">
                <ShieldAlert size={14} className="text-brand-500" />
                GKAD SIGNAL CENTER
              </h4>
              <div className="flex items-center gap-1.5 mt-1">
                {isConnected ? (
                  <div className="flex items-center gap-1">
                    <Wifi size={8} className="text-emerald-500" />
                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">En Línea</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <WifiOff size={8} className="text-red-500" />
                    <span className="text-[7px] font-black text-red-500 uppercase tracking-widest">Desconectado</span>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); fetchNotifications(); }}
              disabled={isRefreshing}
              className="p-2 hover:bg-brand-500/10 rounded-lg text-muted-foreground hover:text-brand-500 transition-all active:rotate-180 duration-500"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 opacity-50">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <p className="text-[10px] uppercase font-black tracking-[0.3em]">Sistema Sincronizado</p>
                <p className="text-[8px] uppercase font-bold tracking-widest mt-1 opacity-40">No hay alertas pendientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-5 hover:bg-brand-500/[0.03] transition-all cursor-pointer group relative ${!notif.read ? 'bg-brand-500/[0.01]' : ''}`}
                  >
                    {!notif.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 shadow-[2px_0_15px_rgba(var(--brand-primary-rgb),0.6)]" />
                    )}
                    <div className="flex gap-4">
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110 shadow-sm ${
                        !notif.read ? 'bg-brand-500/10 border-brand-500/20' : 'bg-muted border-border/50'
                      }`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${
                            notif.type === 'SYSTEM_ERROR' ? 'text-red-500' :
                            notif.type === 'HIGH_VALUE_SALE' ? 'text-emerald-500' :
                            'text-brand-500'
                          }`}>
                            {getLabel(notif.type)}
                          </p>
                          <div className="flex items-center gap-1 text-[8px] text-muted-foreground font-bold">
                            <Clock size={8} />
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                          </div>
                        </div>
                        <p className={`text-xs font-black tracking-tight mb-1 truncate ${notif.read ? 'text-foreground/60' : 'text-foreground'}`}>
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 font-medium">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div 
            className="p-4 border-t border-border bg-muted/50 text-center hover:bg-brand-500 hover:text-white transition-all cursor-pointer group" 
            onClick={() => setIsOpen(false)}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.4em] group-hover:tracking-[0.6em] transition-all">
              CERRAR RADAR
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
