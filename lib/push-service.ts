import webpush from "web-push";

import { prisma } from "@/lib/prisma";
import { type PushNotificationPayload, type BrowserPushSubscriptionPayload } from "@/lib/push-types";
import { getUnsentDueReminders, markRemindersAsSent } from "@/lib/reminder-service";

const fallbackVapidSubject = "mailto:first-step@example.com";

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
  process.env.VAPID_PUBLIC_KEY?.trim() ||
  "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
const vapidSubject = process.env.VAPID_SUBJECT?.trim() || fallbackVapidSubject;

let webPushConfigured = false;

function configureWebPush() {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return false;
  }

  if (!webPushConfigured) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    webPushConfigured = true;
  }

  return true;
}

export const pushSetupState = {
  hasPublicKey: Boolean(vapidPublicKey),
  hasPrivateKey: Boolean(vapidPrivateKey),
  vapidSubject,
};

export function getClientPushConfig() {
  return {
    publicKey: vapidPublicKey || null,
    configured: configureWebPush(),
  };
}

function isValidSubscriptionPayload(input: BrowserPushSubscriptionPayload | null | undefined) {
  return Boolean(
    input?.endpoint &&
      input.keys?.p256dh &&
      input.keys?.auth,
  );
}

export async function upsertPushSubscription(input: {
  subscription: BrowserPushSubscriptionPayload;
  userAgent?: string | null;
  platform?: string | null;
}) {
  if (!isValidSubscriptionPayload(input.subscription)) {
    throw new Error("Invalid push subscription payload.");
  }

  return prisma.devicePushSubscription.upsert({
    where: {
      endpoint: input.subscription.endpoint,
    },
    update: {
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      userAgent: input.userAgent ?? null,
      platform: input.platform ?? null,
      isActive: true,
      lastSeenAt: new Date(),
    },
    create: {
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      userAgent: input.userAgent ?? null,
      platform: input.platform ?? null,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });
}

export async function deactivatePushSubscription(endpoint: string) {
  if (!endpoint) {
    return null;
  }

  return prisma.devicePushSubscription.updateMany({
    where: {
      endpoint,
    },
    data: {
      isActive: false,
    },
  });
}

async function sendWebPush(
  subscription: BrowserPushSubscriptionPayload,
  payload: PushNotificationPayload,
) {
  if (!configureWebPush()) {
    throw new Error(
      "Web Push 未配置完成。请补齐 NEXT_PUBLIC_VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY 和 VAPID_SUBJECT。",
    );
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60,
    urgency: "high",
  });
}

function isExpiredSubscriptionError(error: unknown) {
  return Boolean(
    typeof error === "object" &&
      error &&
      "statusCode" in error &&
      ((error as { statusCode?: number }).statusCode === 404 ||
        (error as { statusCode?: number }).statusCode === 410),
  );
}

function buildReminderPushPayload(reminder: {
  taskId: string;
  content: string;
  messageShown: string;
  scheduledForIso: string;
}) {
  return {
    title: reminder.content.length > 22 ? `${reminder.content.slice(0, 22)}...` : reminder.content,
    body: reminder.messageShown,
    url: `/reminders?taskId=${reminder.taskId}`,
    tag: `first-step:${reminder.taskId}:${reminder.scheduledForIso}`,
    taskId: reminder.taskId,
    scheduledForIso: reminder.scheduledForIso,
    channel: "reminder" as const,
  };
}

export async function sendTestPush(input: {
  subscription: BrowserPushSubscriptionPayload;
  userAgent?: string | null;
  platform?: string | null;
}) {
  await upsertPushSubscription(input);

  const payload = {
    title: "第一步提醒",
    body: "测试推送已经接通。后续到提醒时间时，设备会优先收到系统通知。",
    url: "/reminders",
    tag: `first-step-test:${Date.now()}`,
    channel: "test" as const,
  };

  await sendWebPush(input.subscription, payload);

  return payload;
}

export async function dispatchDueReminderPushes(baseTime = new Date()) {
  const reminders = await getUnsentDueReminders(baseTime);

  if (reminders.length === 0) {
    return {
      sentReminders: 0,
      sentNotifications: 0,
      failedNotifications: 0,
      skippedReason: "no_due_reminders" as const,
    };
  }

  const subscriptions = await prisma.devicePushSubscription.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (subscriptions.length === 0) {
    return {
      sentReminders: 0,
      sentNotifications: 0,
      failedNotifications: 0,
      skippedReason: "no_active_subscriptions" as const,
    };
  }

  let sentReminders = 0;
  let sentNotifications = 0;
  let failedNotifications = 0;

  for (const reminder of reminders) {
    const payload = buildReminderPushPayload(reminder);
    let delivered = false;

    for (const subscription of subscriptions) {
      try {
        await sendWebPush(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );

        delivered = true;
        sentNotifications += 1;
      } catch (error) {
        failedNotifications += 1;

        if (isExpiredSubscriptionError(error)) {
          await deactivatePushSubscription(subscription.endpoint);
        }
      }
    }

    if (delivered) {
      await markRemindersAsSent([
        {
          taskId: reminder.taskId,
          messageShown: reminder.messageShown,
          scheduledForIso: reminder.scheduledForIso,
        },
      ]);
      sentReminders += 1;
    }
  }

  return {
    sentReminders,
    sentNotifications,
    failedNotifications,
    skippedReason: null,
  };
}
