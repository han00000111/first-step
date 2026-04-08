export type BrowserPushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  taskId?: string;
  scheduledForIso?: string;
  channel: "reminder" | "test";
};
