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
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            background: '#0a0a0a',
            border: '0.5px solid #1e1e1e',
            borderRadius: '14px',
            overflow: 'hidden',
            zIndex: 100,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <ShieldAlert size={13} style={{ color: 'var(--brand-primary)' }} />
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
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#555',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = 'var(--brand-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555'; }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* Notification list */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar">
            {notifications.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <div style={{ height: '48px', width: '48px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', opacity: 0.5 }}>
                  <CheckCircle2 size={24} style={{ color: '#22c55e' }} />
                </div>
                <p style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#555', margin: 0 }}>Sistema Sincronizado</p>
                <p style={{ fontSize: '9px', color: '#333', marginTop: '4px' }}>No hay alertas pendientes</p>
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {notifications.map((notif) => {
                  const colors = getTypeColor(notif.type);
                  return (
                    <div
                      key={notif.id}
                      style={{
                        position: 'relative',
                        background: '#0f0f0f',
                        border: '0.5px solid #1a1a1a',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
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
                          <p style={{ color: '#fff', fontSize: '12px', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {notif.title}
                          </p>
                          <p style={{ color: '#555', fontSize: '11px', margin: '3px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#333', display: 'flex', alignItems: 'center', gap: '3px' }}>
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
            style={{
              padding: '12px',
              borderTop: '0.5px solid #1e1e1e',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onClick={() => setIsOpen(false)}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#555', transition: 'color 0.15s' }}>
              Cerrar
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
