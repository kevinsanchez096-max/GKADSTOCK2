import { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CheckCircle2, UserPlus, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const NotificationBell = () => {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) return;

    // Fetch initial new organizations (last 10)
    const fetchRecentOrgs = async () => {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setNotifications(data);
        // Assume anything less than 24 hours is "unread" for demo purposes, 
        // or just consider the new ones that arrive while connected
        const recent = data.filter(org => new Date(org.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000);
        setUnreadCount(recent.length);
      }
    };

    fetchRecentOrgs();

    // Subscribe to new organizations
    const subscription = supabase
      .channel('new-organizations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'organizations' },
        (payload) => {
          const newOrg = payload.new;
          setNotifications(prev => [newOrg, ...prev].slice(0, 10));
          setUnreadCount(prev => prev + 1);
          
          // Optional: Native browser notification if granted
          if (Notification.permission === 'granted') {
             new Notification('GKAD SYSTEM - Nueva Empresa', {
               body: `La empresa ${newOrg.name} se ha registrado en el sistema.`,
             });
          }
        }
      )
      .subscribe();

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setUnreadCount(0); // clear count on open
        }}
        className="relative p-2.5 bg-muted text-muted-foreground hover:text-brand-600 hover:bg-card hover:border-border border border-transparent rounded-xl transition-all shadow-sm"
        title="Notificaciones de Sistema"
      >
        <Bell size={18} className={unreadCount > 0 ? "animate-pulse text-brand-500" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-background shadow-lg shadow-red-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-fade-in origin-top-right">
          <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
            <h4 className="font-black text-sm uppercase tracking-tight flex items-center gap-2 text-foreground">
              <ShieldAlert size={14} className="text-brand-500" />
              Alertas de Sistema
            </h4>
            <span className="text-[9px] uppercase tracking-widest font-bold text-brand-500 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20">
              En Vivo
            </span>
          </div>
          
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle2 size={30} className="mx-auto mb-2 opacity-20" />
                <p className="text-[10px] uppercase font-bold tracking-widest">No hay alertas recientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((org, idx) => (
                  <div key={org.id || idx} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex gap-3">
                      <div className="h-9 w-9 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                        <UserPlus size={16} className="text-brand-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Nueva Cuenta Registrada</p>
                        <p className="text-sm font-bold text-foreground truncate mt-0.5">{org.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock size={10} /> 
                          {org.created_at ? formatDistanceToNow(new Date(org.created_at), { addSuffix: true, locale: es }) : 'Recientemente'}
                        </p>
                      </div>
                      {!org.is_active && (
                        <div className="h-2 w-2 rounded-full bg-amber-500 mt-2 shadow-[0_0_8px_rgba(245,158,11,0.5)]" title="Pendiente de activación"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-border bg-muted text-center hover:bg-muted/80 transition-colors cursor-pointer" onClick={() => setIsOpen(false)}>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Ocultar Panel
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
