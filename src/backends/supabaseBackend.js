// Supabase-Backend-Adapter.
//
// Implementiert dieselbe Schnittstelle wie der Firebase-Adapter, nutzt aber
// Supabase (Postgres + Realtime). Der gesamte geteilte Zustand eines Teams
// liegt in einer einzigen Zeile der Tabelle `team_state`:
//
//   team_state(team_id text primary key, data jsonb, updated_at timestamptz)
//
// Das SQL zum Anlegen der Tabelle liefert der Einrichtungs-Assistent.

import { createClient } from '@supabase/supabase-js';

const TABLE = 'team_state';

export function createSupabaseBackend(config) {
  const client = createClient(config.supabase.url, config.supabase.apiKey, {
    auth: { persistSession: false }
  });
  const teamId = config.teamId;

  function initSync({ onRemoteState, onStatus, onReady, onError }) {
    let readySent = false;
    let disposed = false;
    let channel = null;

    function markReady() {
      if (readySent) {
        return;
      }
      readySent = true;
      onReady?.();
    }

    function handleRow(row) {
      if (row?.data) {
        onStatus?.('connected');
        onRemoteState?.(row.data);
      }
    }

    async function loadInitialState() {
      onStatus?.('connecting');
      const { data, error } = await client
        .from(TABLE)
        .select('data')
        .eq('team_id', teamId)
        .maybeSingle();

      if (disposed) {
        return;
      }
      if (error) {
        onStatus?.('error');
        onError?.(error);
        return;
      }
      onStatus?.('connected');
      handleRow(data);
      markReady();
    }

    function subscribeRealtime() {
      channel = client
        .channel(`team_state:${teamId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLE, filter: `team_id=eq.${teamId}` },
          (payload) => {
            handleRow(payload.new);
            markReady();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            onStatus?.('connected');
            markReady();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onStatus?.('error');
          }
        });
    }

    loadInitialState();
    subscribeRealtime();

    async function pushState(syncState) {
      try {
        onStatus?.('syncing');
        const { error } = await client.from(TABLE).upsert(
          {
            team_id: teamId,
            data: syncState,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'team_id' }
        );
        if (error) {
          onStatus?.('error');
          onError?.(error);
          return;
        }
        onStatus?.('connected');
        markReady();
      } catch (error) {
        onStatus?.('error');
        onError?.(error);
      }
    }

    return {
      pushState,
      dispose() {
        disposed = true;
        if (channel) {
          client.removeChannel(channel);
        }
      }
    };
  }

  return { initSync };
}
