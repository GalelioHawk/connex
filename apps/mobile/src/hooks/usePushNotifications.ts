import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { useAuthStore } from '../store/authStore';
import { useMessageStore } from '../store/messageStore';
import { authService } from '../services/auth';
import { navigateToChatRoom } from '../navigation/navigationRef';
import type { MessageWithSender } from '../services/chat';

export default function usePushNotifications() {
  const user        = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setPushed   = useMessageStore((s) => s.setPushedMessage);

  useEffect(() => {
    // expo-notifications v55 uses isRunningInExpoGo() internally before throwing.
    // Use the exact same check to bail out before any notification API is called.
    if (isRunningInExpoGo()) return;

    let foregroundSub: Notifications.EventSubscription | undefined;
    let tapSub:        Notifications.EventSubscription | undefined;

    try {
      registerDevice(user, accessToken);

      foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as Record<string, string>;
        if (data?.type !== 'new_message' || !data?.message_id) return;

        const msg: MessageWithSender = {
          id:              data.message_id,
          conversation_id: data.conversation_id,
          sender_id:       data.sender_id,
          content:         data.content || null,
          type:            (data.message_type as MessageWithSender['type']) ?? 'text',
          media_url:       null,
          status:          'sent',
          created_at:      data.created_at,
          sender:          { id: data.sender_id, name: data.sender_name, avatar_url: null },
        };
        setPushed(msg);
      });

      tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        if (data?.type === 'new_message' && data?.conversation_id) {
          navigateToChatRoom(data.conversation_id, data.conversation_title ?? 'Chat');
        }
      });
    } catch { /* non-fatal */ }

    return () => {
      foregroundSub?.remove();
      tapSub?.remove();
    };
  }, [user?.id]);
}

async function registerDevice(
  user: { id: string } | null,
  accessToken: string | null,
) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name:             'Messages',
        importance:       Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#0D1B2A',
        showBadge:        true,
      });
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    if (tokenData.data && user && accessToken) {
      await authService.saveFcmToken(user.id, tokenData.data, accessToken);
    }
  } catch { /* non-fatal */ }
}
