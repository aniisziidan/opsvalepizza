import webPush from 'web-push';

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidConfigured = false;

function ensureVapidConfig() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@opsvale.eu';

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error('Failed to configure VAPID details for Web Push:', err);
    return false;
  }
}

/**
 * Dispatches a Web Push notification to a target subscription.
 * Returns true on success, false on permanent 404/410 gone (indicating subscription should be removed).
 */
export async function sendWebPushNotification(
  sub: PushSubscriptionKeys,
  payload: WebPushPayload
): Promise<{ success: boolean; shouldRemove: boolean }> {
  if (!ensureVapidConfig()) {
    return { success: false, shouldRemove: false };
  }

  const pushSubscription: webPush.PushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    url: payload.url || '/admin/notifications',
    tag: payload.tag,
    data: payload.data,
  });

  try {
    await webPush.sendNotification(pushSubscription, payloadString);
    return { success: true, shouldRemove: false };
  } catch (err: any) {
    // 404 (Not Found) or 410 (Gone) indicates the subscription has expired or user unsubscribed
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { success: false, shouldRemove: true };
    }
    console.error('Web Push delivery error:', err.message || err);
    return { success: false, shouldRemove: false };
  }
}
