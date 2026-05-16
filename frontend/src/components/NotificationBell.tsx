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

// Color config por tipo de notificación
const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
  HIGH_VALUE_SALE: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)', icon: '#22c55e', dot: '#22c55e' },
  NEW_USER:        { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)', icon: '#3b82f6', dot: '#3b82f6' },
  ORG_CREATED:     { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)', icon: '#22c55e', dot: '#22c55e' },
  SYSTEM_ERROR:    { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.15)',  icon: '#ef4444', dot: '#ef4444' },
  ORG_DELETED:     { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.15)',  icon: '#ef4444', dot: '#ef4444' },
  PLAN_LIMIT:      { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.15)', icon: '#f97316', dot: '#f97316' },
  ORG_STATUS:      { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', icon: '#f59e0b', dot: '#f59e0b' },
  DEFAULT:         { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.15)', icon: '#6366f1', dot: '#6366f1' },
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
          background: isOpen ? '#1a1a1a' : 'transparent',
          border: isOpen ? '1px solid #2a2a2a' : '1px solid transparent',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          color: isOpen ? 'var(--brand-primary)' : '#888',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => { if (!isOpen) { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = 'var(--brand-primary)'; }}}
        onMouseLeave={(e) => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}}
        title="Centro de Control Global"
      >
        <Bell size={18} />
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
              border: '2px solid #0f0f0f',
              boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 w-[340px] bg-card border border-border/50 rounded-2xl overflow-hidden z-[100] shadow-2xl backdrop-blur-xl"
          style={{ top: 'calc(100% + 8px)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground flex items-center gap-1.5 m-0">
                <ShieldAlert size={13} className="text-brand-500" />
                Signal Center
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                {isConnected ? (
                  <>
                    <Wifi size={8} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: '7px', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.15em' }}>En Línea</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={8} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '7px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Desconectado</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fetchNotifications(); }}
              disabled={isRefreshing}
              className="p-1.5 bg-transparent border-none rounded-lg cursor-pointer text-muted-foreground hover:bg-muted/50 hover:text-brand-500 transition-all duration-150"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* Notification list */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 opacity-50">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground m-0">Sistema Sincronizado</p>
                <p className="text-[9px] text-muted-foreground/60 mt-1">No hay alertas pendientes</p>
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {notifications.map((notif) => {
                  const colors = getTypeColor(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className="relative bg-card/50 border border-border/50 rounded-xl p-3 mb-1.5 cursor-pointer transition-colors hover:border-brand-500/30 hover:bg-muted/30"
                    >
                      {/* Unread dot */}
                      {!notif.read && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: colors.dot,
                            boxShadow: `0 0 6px ${colors.dot}`,
                          }}
                        />
                      )}

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {/* Icon box */}
                        <div
                          style={{
                            height: '32px',
                            width: '32px',
                            borderRadius: '8px',
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: colors.icon,
                          }}
                        >
                          {getIcon(notif.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="text-foreground text-xs font-medium m-0 truncate">
                            {notif.title}
                          </p>
                          <p className="text-muted-foreground text-[11px] mt-1 mb-0 leading-tight line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex justify-end mt-1.5">
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          <Clock size={8} />
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div
            className="p-3 border-t border-border/50 text-center cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setIsOpen(false)}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground">
              Cerrar
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
