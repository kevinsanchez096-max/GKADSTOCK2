const fs = require('fs');
let content = fs.readFileSync('frontend/src/store/useOrganizationStore.ts', 'utf8');

// Regex for subscribeToChanges
const subRegex = /subscribeToChanges: \(id\) => \{[\s\S]*?set\(\{ isRealtimeActive: true \}\);\s*\}/;
const subReplacement = \subscribeToChanges: async (id) => {
    if (!id) return;
    if (get().isRealtimeActive) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[REALTIME] No hay sesión activa.');
      return;
    }
    console.log(\\\[REALTIME] Suscribiendo a cambios de Org: \\\\\\);
    supabase.channel(\\\org_changes_\\\\\\)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'organizations', filter: \\\id=eq.\\\\\\ },
        (payload) => {
          const newOrg = payload.new;
          set({ organization: newOrg });
          get().applyBranding(newOrg);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') set({ isRealtimeActive: true });
      });
  }\;

// Regex for unsubscribeFromChanges
const unsubRegex = /unsubscribeFromChanges: \(\) => \{[\s\S]*?set\(\{ isRealtimeActive: false \}\);\s*\}/;
const unsubReplacement = \unsubscribeFromChanges: async () => {
    const { organization } = get();
    if (organization?.id) {
      await supabase.channel(\\\org_changes_\\\\\\).unsubscribe();
    }
    await supabase.removeAllChannels();
    set({ isRealtimeActive: false });
  }\;

content = content.replace(subRegex, subReplacement);
content = content.replace(unsubRegex, unsubReplacement);

fs.writeFileSync('frontend/src/store/useOrganizationStore.ts', content, 'utf8');
