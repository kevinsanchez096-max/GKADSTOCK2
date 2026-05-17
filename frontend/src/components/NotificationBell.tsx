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
  WifiOff,
  Trash2
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

// Configuración de colores y acentos adaptativos por tipo de notificación
const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string; dot: string; accent: string }> = {
  HIGH_VALUE_SALE: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.15)', icon: '#22c55e', dot: '#22c55e', accent: '#22c55e' },
  NEW_USER:        { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', icon: '#3b82f6', dot: '#3b82f6', accent: '#3b82f6' },
  ORG_CREATED:     { bg: 'color-mix(in srgb, var(--brand-primary), transparent 96%)', border: 'color-mix(in srgb, var(--brand-primary), transparent 85%)', icon: 'var(--brand-primary)', dot: 'var(--brand-primary)', accent: 'var(--brand-primary)' },
  SYSTEM_ERROR:    { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.15)',  icon: '#ef4444', dot: '#ef4444', accent: '#ef4444' },
  ORG_DELETED:     { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.15)',  icon: '#ef4444', dot: '#ef4444', accent: '#ef4444' },
  PLAN_LIMIT:      { bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.15)', icon: '#f97316', dot: '#f97316', accent: '#f97316' },
  ORG_STATUS:      { bg: 'color-mix(in srgb, var(--brand-primary), transparent 96%)', border: 'color-mix(in srgb, var(--brand-primary), transparent 85%)', icon: 'var(--brand-primary)', dot: 'var(--brand-primary)', accent: 'var(--brand-primary)' },
  DEFAULT:         { bg: 'color-mix(in srgb, var(--brand-primary), transparent 96%)', border: 'color-mix(in srgb, var(--brand-primary), transparent 85%)', icon: 'var(--brand-primary)', dot: 'var(--brand-primary)', accent: 'var(--brand-primary)' },
};

const getTypeColor = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.DEFAULT;

export const NotificationBell = () => {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = useRef<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  // Cierre automático al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

    // Configuración de Realtime
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
      case 'NEW_USER': return <UserPlus size={14} />;
      case 'HIGH_VALUE_SALE': return <TrendingUp size={14} />;
      case 'ORG_STATUS': return <ZapOff size={14} />;
      case 'PLAN_LIMIT': return <AlertTriangle size={14} />;
      case 'SYSTEM_ERROR': return <AlertCircle size={14} />;
      case 'ORG_CREATED': return <CheckCircle2 size={14} />;
      case 'ORG_DELETED': return <Trash2 size={14} />;
      default: return <ShieldAlert size={14} />;
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button 
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) markAllAsRead();
        }}
        style={{
          position: 'relative',
          padding: '10px',
          background: isOpen ? 'color-mix(in srgb, var(--brand-primary), transparent 90%)' : 'transparent',
          border: isOpen ? '1px solid var(--brand-primary)' : '1px solid transparent',
          borderRadius: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          color: isOpen ? 'var(--brand-primary)' : '#888',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => { 
          if (!isOpen) { 
            e.currentTarget.style.background = 'color-mix(in srgb, var(--brand-primary), transparent 95%)'; 
            e.currentTarget.style.color = 'var(--brand-primary)'; 
          }
        }}
        onMouseLeave={(e) => { 
          if (!isOpen) { 
            e.currentTarget.style.background = 'transparent'; 
            e.currentTarget.style.color = '#888'; 
          }
        }}
        title="Centro de Control Global"
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              height: '16px',
              width: '16px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 900,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--border)',
              boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 w-[360px] bg-card border border-border/80 rounded-[2.5rem] overflow-hidden z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl animate-fade-in"
          style={{ top: 'calc(100% + 12px)' }}
        >
          {/* Header */}
          <div 
            style={{
              padding: '24px 28px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'color-mix(in srgb, var(--brand-primary), transparent 95%)'
            }}
            className="flex items-center justify-between"
          >
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2 m-0 font-outfit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                Signal Center
              </h4>
              <div className="flex items-center gap-1.5 mt-1.5">
                {isConnected ? (
                  <>
                    <Wifi size={10} className="text-emerald-500 animate-pulse" />
                    <span style={{ fontSize: '8px', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.15em' }}>En Línea</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={10} className="text-red-500" />
                    <span style={{ fontSize: '8px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Desconectado</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fetchNotifications(); }}
              disabled={isRefreshing}
              className="h-9 w-9 bg-card border border-border/80 text-muted-foreground hover:text-brand-500 hover:border-brand-500/30 rounded-xl cursor-pointer flex items-center justify-center transition-all duration-300 active:scale-90"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* Notification list */}
          <div style={{ maxHeight: '420px', overflowY: 'auto' }} className="custom-scrollbar p-5 space-y-3 bg-muted/20 dark:bg-transparent">
            {notifications.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="h-14 w-14 rounded-[1.5rem] bg-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-4 opacity-75">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground m-0 font-outfit">Sistema Sincronizado</p>
                <p className="text-[9px] text-muted-foreground/60 mt-1 uppercase font-bold tracking-wider">No hay alertas pendientes</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const colors = getTypeColor(notif.type);
                return (
                  <div
                    key={notif.id}
                    className="relative border rounded-[1.5rem] p-4.5 cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 group overflow-hidden"
                    style={{
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `color-mix(in srgb, ${colors.accent}, var(--border) 60%)`,
                      borderLeftWidth: '5px',
                      borderLeftColor: colors.accent,
                      backgroundColor: `color-mix(in srgb, ${colors.accent}, var(--card) 95%)`,
                      padding: '16px'
                    }}
                  >
                    {/* Unread dot with pulse neon */}
                    {!notif.read && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '16px',
                          right: '16px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: colors.dot,
                          boxShadow: `0 0 10px ${colors.dot}`,
                        }}
                        className="animate-pulse"
                      />
                    )}

                    <div className="flex gap-4">
                      {/* High-tech Icon box */}
                      <div
                        style={{
                          height: '36px',
                          width: '36px',
                          borderRadius: '12px',
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: colors.accent,
                          boxShadow: `0 4px 12px color-mix(in srgb, ${colors.accent}, transparent 95%)`
                        }}
                        className="transition-transform group-hover:scale-110 duration-300"
                      >
                        {getIcon(notif.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }} className="space-y-1">
                        <p className="text-foreground text-[11px] font-black uppercase tracking-tight m-0 truncate group-hover:text-brand-500 transition-colors font-outfit">
                          {notif.title}
                        </p>
                        <p className="text-muted-foreground text-[10px] font-medium leading-relaxed m-0 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex justify-end mt-2.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                        <Clock size={10} className="text-muted-foreground/40" />
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          <div
            className="p-4.5 border-t border-border/80 text-center cursor-pointer bg-muted/20 transition-all duration-300 hover:bg-brand-500/10"
            onClick={() => setIsOpen(false)}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground hover:text-brand-500 transition-colors duration-300 font-outfit">
              Cerrar Centro
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
