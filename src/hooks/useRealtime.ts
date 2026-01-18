/**
 * Real-time Subscription Hook
 * Provides real-time updates via Supabase Realtime
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// =============================================================================
// Types
// =============================================================================

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T> {
  table: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

// =============================================================================
// Hook: useRealtime
// =============================================================================

/**
 * Subscribe to real-time changes on a Supabase table
 */
export function useRealtime<T extends Record<string, unknown>>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeOptions<T>): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const subscribe = useCallback(() => {
    if (!enabled) return;

    const supabase = supabaseRef.current;
    const channelName = `realtime:${schema}:${table}${filter ? `:${filter}` : ''}`;

    // Unsubscribe from existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Build filter config
    const filterConfig: {
      event: PostgresChangeEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };

    if (filter) {
      filterConfig.filter = filter;
    }

    // Create new channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        filterConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Call general onChange handler
          if (onChange) {
            onChange(payload);
          }

          // Call specific event handlers
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert && payload.new) {
                onInsert(payload.new as T);
              }
              break;
            case 'UPDATE':
              if (onUpdate && payload.old && payload.new) {
                onUpdate({
                  old: payload.old as T,
                  new: payload.new as T,
                });
              }
              break;
            case 'DELETE':
              if (onDelete && payload.old) {
                onDelete(payload.old as T);
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(new Error('Failed to subscribe to channel'));
        }
      });

    channelRef.current = channel;
  }, [table, schema, event, filter, onInsert, onUpdate, onDelete, onChange, enabled]);

  const reconnect = useCallback(() => {
    subscribe();
  }, [subscribe]);

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    subscribe();

    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);

  return {
    isConnected,
    error,
    reconnect,
  };
}

// =============================================================================
// Hook: useRealtimePresence
// =============================================================================

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
    [key: string]: unknown;
  }[];
}

interface UseRealtimePresenceOptions {
  channelName: string;
  userId: string;
  metadata?: Record<string, unknown>;
  onSync?: (state: PresenceState) => void;
  onJoin?: (key: string, currentPresence: unknown[], newPresence: unknown[]) => void;
  onLeave?: (key: string, currentPresence: unknown[], leftPresence: unknown[]) => void;
  enabled?: boolean;
}

interface UseRealtimePresenceReturn {
  presenceState: PresenceState;
  isConnected: boolean;
  error: Error | null;
  track: (metadata?: Record<string, unknown>) => Promise<void>;
  untrack: () => Promise<void>;
}

/**
 * Track user presence in real-time
 */
export function useRealtimePresence({
  channelName,
  userId,
  metadata = {},
  onSync,
  onJoin,
  onLeave,
  enabled = true,
}: UseRealtimePresenceOptions): UseRealtimePresenceReturn {
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const track = useCallback(async (extraMetadata: Record<string, unknown> = {}) => {
    if (!channelRef.current) return;

    try {
      await channelRef.current.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        ...metadata,
        ...extraMetadata,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to track presence'));
    }
  }, [userId, metadata]);

  const untrack = useCallback(async () => {
    if (!channelRef.current) return;

    try {
      await channelRef.current.untrack();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to untrack presence'));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        setPresenceState(state);
        if (onSync) {
          onSync(state);
        }
      })
      .on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
        if (onJoin) {
          onJoin(key, currentPresences, newPresences);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
        if (onLeave) {
          onLeave(key, currentPresences, leftPresences);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          // Auto-track presence on subscribe
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...metadata,
          });
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(new Error('Failed to subscribe to presence channel'));
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, userId, metadata, onSync, onJoin, onLeave, enabled]);

  return {
    presenceState,
    isConnected,
    error,
    track,
    untrack,
  };
}

// =============================================================================
// Hook: useRealtimeBroadcast
// =============================================================================

interface UseRealtimeBroadcastOptions<T> {
  channelName: string;
  eventName: string;
  onMessage?: (payload: T) => void;
  enabled?: boolean;
}

interface UseRealtimeBroadcastReturn<T> {
  broadcast: (payload: T) => Promise<void>;
  isConnected: boolean;
  error: Error | null;
}

/**
 * Broadcast messages to other clients in real-time
 */
export function useRealtimeBroadcast<T>({
  channelName,
  eventName,
  onMessage,
  enabled = true,
}: UseRealtimeBroadcastOptions<T>): UseRealtimeBroadcastReturn<T> {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const broadcast = useCallback(async (payload: T) => {
    if (!channelRef.current) {
      throw new Error('Channel not connected');
    }

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: eventName,
        payload,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to broadcast message'));
      throw err;
    }
  }, [eventName]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: eventName }, ({ payload }) => {
        if (onMessage) {
          onMessage(payload as T);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(new Error('Failed to subscribe to broadcast channel'));
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, eventName, onMessage, enabled]);

  return {
    broadcast,
    isConnected,
    error,
  };
}

export default useRealtime;
