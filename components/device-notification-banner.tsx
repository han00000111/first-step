"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { BellRing, RefreshCw, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

type NotificationDispatchPayload = {
  taskId: string;
  title: string;
  body: string;
  url: string;
  tag: string;
  slotKey: string;
  scheduledForIso: string;
};

const DEVICE_NOTIFICATION_KEY = "first-step-device-notified:";
const POLL_INTERVAL_MS = 30_000;

type NotificationSupportState = NotificationPermission | "unsupported";

function getPermissionState(): NotificationSupportState {
  if (typeof window === "undefined") {
    return "default";
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }

  return Notification.permission;
}

function buildStorageKey(slotKey: string) {
  return `${DEVICE_NOTIFICATION_KEY}${slotKey}`;
}

function hasDispatched(slotKey: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem(buildStorageKey(slotKey)));
}

function markDispatched(slotKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(buildStorageKey(slotKey), String(Date.now()));
}

export function DeviceNotificationBanner() {
  const [permission, setPermission] = useState<NotificationSupportState>(
    getPermissionState,
  );
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("设备通知未开启");
  const [isBusy, setIsBusy] = useState(false);
  const dispatchingRef = useRef(false);

  const isSupported = permission !== "unsupported";
  const isGranted = permission === "granted";

  const supportDescription = useMemo(() => {
    if (permission === "unsupported") {
      return "当前浏览器不支持 Notification API 或 Service Worker。项目仍会保留站内提醒中心。";
    }

    if (permission === "denied") {
      return "通知权限已被拒绝。你仍然可以继续使用站内提醒；如果要恢复设备通知，需要到浏览器设置里重新开启。";
    }

    if (permission === "granted") {
      return "系统通知已接通。当前 Web 版会在页面打开、浏览器仍允许运行时，优先尝试派发设备通知。";
    }

    return "开启后，到提醒时间时项目会先尝试发出系统通知，再把同一条提醒保留在站内提醒中心。";
  }, [permission]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setPermission(getPermissionState());
      return;
    }

    let cancelled = false;

    async function registerWorker() {
      try {
        const workerRegistration = await navigator.serviceWorker.register(
          "/sw-notifications.js",
        );
        await navigator.serviceWorker.ready;

        if (!cancelled) {
          setRegistration(workerRegistration);
          setStatusMessage(
            Notification.permission === "granted"
              ? "设备通知已就绪"
              : "设备通知可开启",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(
            error instanceof Error
              ? `通知 service worker 注册失败：${error.message}`
              : "通知 service worker 注册失败",
          );
        }
      }
    }

    void registerWorker();

    const syncPermission = () => {
      setPermission(getPermissionState());
    };

    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, []);

  async function showSystemNotification(reminder: NotificationDispatchPayload) {
    if (typeof window === "undefined" || Notification.permission !== "granted") {
      return false;
    }

    const notificationOptions: NotificationOptions = {
      body: reminder.body,
      tag: reminder.tag,
      data: {
        url: reminder.url,
        slotKey: reminder.slotKey,
        taskId: reminder.taskId,
      },
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    };

    if (registration) {
      await registration.showNotification(reminder.title, notificationOptions);
      return true;
    }

    const notification = new Notification(reminder.title, notificationOptions);
    notification.onclick = () => {
      window.focus();
      window.location.href = reminder.url;
    };
    return true;
  }

  async function dispatchDueNotifications() {
    if (
      dispatchingRef.current ||
      typeof window === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    dispatchingRef.current = true;

    try {
      const response = await fetch("/api/notifications/due", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorPayload?.error ?? "提醒通知拉取失败");
      }

      const data = (await response.json()) as {
        reminders?: NotificationDispatchPayload[];
      };

      const reminders = data.reminders ?? [];
      let displayedCount = 0;

      for (const reminder of reminders) {
        if (hasDispatched(reminder.slotKey)) {
          continue;
        }

        const displayed = await showSystemNotification(reminder);

        if (displayed) {
          markDispatched(reminder.slotKey);
          displayedCount += 1;
        }
      }

      setStatusMessage(
        displayedCount > 0
          ? `刚刚发出了 ${displayedCount} 条设备通知`
          : "设备通知已连接，当前没有新的到点提醒",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "设备通知派发失败",
      );
    } finally {
      dispatchingRef.current = false;
    }
  }

  const dispatchDueNotificationsEvent = useEffectEvent(async () => {
    await dispatchDueNotifications();
  });

  useEffect(() => {
    if (!isGranted) {
      return;
    }

    void dispatchDueNotificationsEvent();

    const timer = window.setInterval(() => {
      void dispatchDueNotificationsEvent();
    }, POLL_INTERVAL_MS);

    const syncOnFocus = () => {
      if (document.visibilityState === "visible") {
        void dispatchDueNotificationsEvent();
      }
    };

    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", syncOnFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", syncOnFocus);
    };
  }, [isGranted, registration]);

  async function handleRequestPermission() {
    if (!isSupported || typeof window === "undefined") {
      return;
    }

    setIsBusy(true);

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission === "granted") {
        setStatusMessage("通知权限已开启");
        await dispatchDueNotifications();
      } else if (nextPermission === "denied") {
        setStatusMessage("通知权限已被拒绝");
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTestNotification() {
    if (!isGranted) {
      return;
    }

    setIsBusy(true);

    try {
      await showSystemNotification({
        taskId: "test",
        title: "第一步提醒",
        body: "测试通知已接通。后续到提醒时间时，项目会优先尝试发出设备通知。",
        url: "/reminders",
        tag: "first-step-test-notification",
        slotKey: `test-${Date.now()}`,
        scheduledForIso: new Date().toISOString(),
      });
      setStatusMessage("测试通知已发送");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "测试通知发送失败",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "mb-5 rounded-[24px] border p-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.2)] sm:p-5",
        isGranted
          ? "border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#eef9f2_100%)]"
          : permission === "denied"
            ? "border-amber-100 bg-[linear-gradient(180deg,#fffdf8_0%,#faf4e9_100%)]"
            : "border-white/80 bg-white/92",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <Smartphone className="h-4 w-4 text-emerald-700" />
            设备通知
          </div>
          <div className="text-sm leading-6 text-zinc-600">{supportDescription}</div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-zinc-500">
            <BellRing className="h-3.5 w-3.5" />
            {statusMessage}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-52">
          {permission === "default" ? (
            <button
              type="button"
              onClick={() => void handleRequestPermission()}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center justify-center rounded-[18px] bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.8)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              开启设备通知
            </button>
          ) : null}

          {permission === "granted" ? (
            <>
              <button
                type="button"
                onClick={() => void handleTestNotification()}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center rounded-[18px] bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.8)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                发送测试通知
              </button>
              <button
                type="button"
                onClick={() => void dispatchDueNotifications()}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                立即同步提醒
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
