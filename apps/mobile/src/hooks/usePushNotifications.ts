import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { useAuthStore } from '../store/authStore';
import { useMessageStore } from '../store/messageStore';
import { useSettingsStore } from '../store/settingsStore';
import { authService } from '../services/auth';
import { chatService } from '../services/chat';
import { navigateToChatRoom } from '../navigation/navigationRef';

export default function usePushNotifications() {
  const sessionId = useAuthStore((s) => s.sessionId);
  const user      = useAuthStore((s) => s.user);
  const setIncoming = useMessageStore((s) => s.setIncomingConversation);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const notificationSound    = useSettingsStore((s) => s.notificationSound);
  const notificationVibrate  = useSettingsStore((s) => s.notificationVibrate);

  // Re-apply notification handler whenever settings change
  useEffect(() => {
    if (isRunningInExpoGo()) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert:  notificationsEnabled,
        shouldShowBanner: notificationsEnabled,
        shouldShowList:   notificationsEnabled,
        shouldPlaySound:  notificationsEnabled && notificationSound,
        shouldSetBadge:   notificationsEnabled,
      }),
    });
  }, [notificationsEnabled, notificationSound, notificationVibrate]);

  useEffect(() => {
    if (isRunningInExpoGo()) return;

    let foregroundSub: Notifications.EventSubscription | undefined;
    let tapSub:        Notifications.EventSubscription | undefined;

    try {
      registerDevice(user, sessionId);

      foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as Record<string, string>;
        if (data?.type !== 'new_message' || !data?.conversation_id) return;

        // Wake up the conversation so useQuery refetches are triggered.
        setIncoming(data.conversation_id);

        // Mark as delivered so the sender sees 2 grey ticks.
        if (sessionId && data.message_id) {
          chatService.markDelivered(sessionId, data.message_id).catch(() => {});
        }
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
  sessionId: string | null,
) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
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

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '154ace6a-f3c3-4098-b8aa-f49fbed6283d',
    });
    if (tokenData.data && sessionId) {
      await authService.saveExpoPushToken(sessionId, tokenData.data);
    }
  } catch { /* non-fatal */ }
}
