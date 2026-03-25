import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthStore } from '../store/authStore';
import type { Id } from '../../convex/_generated/dataModel';

export default function usePresence() {
  const sessionId          = useAuthStore((s) => s.sessionId);
  const setPresenceMutation    = useMutation(api.users.setPresence);
  const markAllDeliveredMutation = useMutation(api.chat.markAllDelivered);

  useEffect(() => {
    if (!sessionId) return;

    const sid = sessionId as Id<'sessions'>;

    function goOnline() {
      setPresenceMutation({ sessionId: sid, isOnline: true }).catch(() => {});
      markAllDeliveredMutation({ sessionId: sid }).catch(() => {});
    }

    function goOffline() {
      setPresenceMutation({ sessionId: sid, isOnline: false }).catch(() => {});
    }

    // Mark online immediately when authenticated
    goOnline();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        goOnline();
      } else {
        goOffline();
      }
    });

    return () => {
      sub.remove();
      goOffline();
    };
  }, [sessionId]);
}
