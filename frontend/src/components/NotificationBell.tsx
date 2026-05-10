import { useState, useEffect } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ZapOff,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SystemNotification {
  id: string;
  created_at: string;
  type: 'NEW_USER' | 'ORG_STATUS' | 'HIGH_VALUE_SALE' | 'SYSTEM_ERROR' | 'PLAN_LIMIT';
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

  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('system_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setNotifications(data);
      const unread = data.filter(n => !n.read).length;
      setUnreadCount(unread);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    fetchNotifications();

    const subscription = supabase
      .channel('system-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_notifications' },
        (payload) => {
          const newNotification = payload.new as SystemNotification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          
          if (Notification.permission === 'granted') {
             new Notification(`GKAD ALERTA: ${newNotification.title}`, {
               body: newNotification.message,
             });
          }
        }
      )
      .subscribe();

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isSuperAdmin]);

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
        className="relative p-2.5 bg-muted text-muted-foreground hover:text-brand-600 hover:bg-card hover:border-border border border-transparent rounded-xl transition-all shadow-sm"
        title="Panel de Control Global"
      >
        <Bell size={18} className={unreadCount > 0 ? "animate-pulse text-brand-500" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-background shadow-lg shadow-red-500/50 animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-fade-in origin-top-right">
          <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
            <h4 className="font-black text-sm uppercase tracking-tight flex items-center gap-2 text-foreground">
              <ShieldAlert size={14} className="text-brand-500" />
              Centro de Alertas
            </h4>
            <span className="text-[9px] uppercase tracking-widest font-bold text-brand-500 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20">
              {notifications.length} Eventos
            </span>
          </div>
          
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-black/5 dark:bg-black/20">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 size={30} className="mx-auto mb-2 opacity-20" />
                <p className="text-[10px] uppercase font-bold tracking-widest">Sistema Limpio</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 hover:bg-brand-500/5 transition-colors cursor-pointer group relative ${!notif.read ? 'bg-brand-500/[0.02]' : ''}`}
                  >
                    {!notif.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 shadow-[2px_0_10px_rgba(var(--brand-primary-rgb),0.5)]" />
                    )}
                    <div className="flex gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all group-hover:scale-110 ${
                        !notif.read ? 'bg-brand-500/10 border-brand-500/30' : 'bg-muted border-border'
                      }`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${
                            notif.type === 'SYSTEM_ERROR' ? 'text-red-500' :
                            notif.type === 'HIGH_VALUE_SALE' ? 'text-emerald-500' :
                            'text-brand-500'
                          }`}>
                            {getLabel(notif.type)}
                          </p>
                          <span className="text-[8px] text-muted-foreground font-bold">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className={`text-xs font-black truncate mt-0.5 ${notif.read ? 'text-foreground/70' : 'text-foreground'}`}>
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-border bg-muted text-center hover:bg-muted/80 transition-colors cursor-pointer" onClick={() => setIsOpen(false)}>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Cerrar Panel
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
