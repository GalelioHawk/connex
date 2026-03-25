import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

interface PushPayload {
  title: string;
  body:  string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to one or more FCM tokens.
 * @param tokens  Single token string or array of token strings.
 * @param payload Notification title, body, and optional data map.
 */
export async function sendPush(
  tokens: string | string[],
  payload: PushPayload,
): Promise<void> {
  const list = Array.isArray(tokens) ? tokens : [tokens];
  if (list.length === 0) return;

  const base = {
    notification: { title: payload.title, body: payload.body },
    data:         payload.data ?? {},
    android:      { priority: 'high' as const },
    apns:         { payload: { aps: { sound: 'default' } } },
  };

  if (list.length === 1) {
    await admin.messaging().send({ ...base, token: list[0] });
    return;
  }

  const response = await admin.messaging().sendEach(
    list.map((token) => ({ ...base, token })),
  );

  const failed = response.responses.filter((r) => !r.success).length;
  if (failed > 0) {
    console.warn(`[FCM] ${failed}/${list.length} notifications failed`);
  }
}
