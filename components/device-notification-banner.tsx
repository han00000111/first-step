"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, RefreshCw, Smartphone } from "lucide-react";

import type { BrowserPushSubscriptionPayload } from "@/lib/push-types";
import { cn } from "@/lib/utils";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";

type RuntimeSupportState = {
  permission: NotificationPermission | "unsupported";
  hasNotificationApi: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  isIos: boolean;
  isStandalone: boolean;
  canUsePush: boolean;
  missingConfig: boolean;
  needsInstallPrompt: boolean;
  platformLabel: string;
};

function detectRuntimeSupport(): RuntimeSupportState {
  if (typeof window === "undefined") {
    return {
      permission: "default",
      hasNotificationApi: false,
      hasServiceWorker: false,
      hasPushManager: false,
      isIos: false,
      isStandalone: false,
      canUsePush: false,
      missingConfig: !vapidPublicKey,
      needsInstallPrompt: false,
      platformLabel: "unknown",
    };
  }

  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const hasNotificationApi = "Notification" in window;
  const hasServiceWorker = "serviceWorker" in navigator;
  const hasPushManager = "PushManager" in window;
  const missingConfig = !vapidPublicKey;
  const needsInstallPrompt = isIos && !isStandalone;
  const permission =
    hasNotificationApi && hasServiceWorker ? Notification.permission : "unsupported";

  return {
    permission,
    hasNotificationApi,
    hasServiceWorker,
    hasPushManager,
    isIos,
    isStandalone,
    canUsePush:
      hasNotificationApi &&
      hasServiceWorker &&
      hasPushManager &&
      !missingConfig &&
      (!isIos || isStandalone),
    missingConfig,
    needsInstallPrompt,
    platformLabel: isIos ? "ios" : /Android/i.test(userAgent) ? "android" : "web",
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function serializeSubscription(
  subscription: PushSubscription | null,
): BrowserPushSubscriptionPayload | null {
  if (!subscription) {
    return null;
  }

  const json = subscription.toJSON();

  if (!json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

export function DeviceNotificationBanner() {
  const [runtime, setRuntime] = useState<RuntimeSupportState>(detectRuntimeSupport);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [subscription, setSubscription] = useState<BrowserPushSubscriptionPayload | null>(null);
  const [statusMessage, setStatusMessage] = useState("设备提醒未开启");
  const [isBusy, setIsBusy] = useState(false);

  const supportDescription = useMemo(() => {
<<<<<<< Updated upstream
    if (!runtime.hasNotificationApi || !runtime.hasServiceWorker) {
      return "当前浏览器还不支持通知权限或 service worker，先继续使用站内提醒。";
    }

    if (runtime.missingConfig) {
      return "当前环境还没配好推送密钥，设备提醒暂时无法启用。";
    }

    if (runtime.needsInstallPrompt) {
      return "iPhone 需要先在 Safari 里添加到主屏幕，再从主屏幕打开，才能启用设备提醒。";
    }

    if (!runtime.hasPushManager) {
      return "当前浏览器不支持 Web Push，设备提醒会回退到站内提醒。";
    }

    if (runtime.permission === "denied") {
      return "通知权限已关闭。要恢复设备提醒，需要到浏览器设置里重新开启。";
    }

    if (runtime.permission === "granted" && subscription) {
      return "设备提醒已连接。到提醒时间时，会优先走系统通知，站内提醒仍会保留。";
    }

    if (runtime.permission === "granted") {
      return "通知权限已开通，还需要完成一次设备订阅，后续系统通知才会真正生效。";
    }

    return "开启后，到提醒时间时会优先发出系统通知，提醒中心里也会保留同一条记录。";
  }, [runtime, subscription]);

  const persistSubscription = useCallback(
    async (nextSubscription: BrowserPushSubscriptionPayload) => {
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: nextSubscription,
          platform: runtime.platformLabel,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "设备订阅保存失败");
      }
    },
    [runtime.platformLabel],
  );

  const syncExistingSubscription = useCallback(
    async (workerRegistration: ServiceWorkerRegistration) => {
      if (!runtime.canUsePush) {
        setSubscription(null);
        return;
      }

      const existing = await workerRegistration.pushManager.getSubscription();
      const serialized = serializeSubscription(existing);

      setSubscription(serialized);

      if (serialized) {
        await persistSubscription(serialized);
        setStatusMessage("设备提醒已连接");
        return;
      }

      if (runtime.permission === "granted") {
        setStatusMessage("通知权限已开启，等待连接设备提醒");
      }
    },
    [persistSubscription, runtime.canUsePush, runtime.permission],
  );
=======
    if (permission === "unsupported") {
      return "当前浏览器还不支持系统通知，站内提醒会继续保留。";
    }

    if (permission === "denied") {
      return "通知权限已被关闭。要恢复设备通知，需要到浏览器设置里重新开启。";
    }

    if (permission === "granted") {
      return "系统通知已接通。到点后会优先尝试发出设备通知。";
    }

    return "开启后，到提醒时间时会先尝试发出系统通知，同时保留站内提醒。";
  }, [permission]);
>>>>>>> Stashed changes

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setRuntime(detectRuntimeSupport());
      return;
    }

    let cancelled = false;

    async function registerWorker() {
      try {
        const nextRegistration = await navigator.serviceWorker.register(
          "/sw-notifications.js",
        );
        await navigator.serviceWorker.ready;

        if (cancelled) {
          return;
        }

        setRegistration(nextRegistration);
        setRuntime(detectRuntimeSupport());
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

    const syncRuntime = () => {
      setRuntime(detectRuntimeSupport());
    };

    window.addEventListener("focus", syncRuntime);
    document.addEventListener("visibilitychange", syncRuntime);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", syncRuntime);
      document.removeEventListener("visibilitychange", syncRuntime);
    };
  }, []);

  useEffect(() => {
    if (!registration) {
      return;
    }

    void syncExistingSubscription(registration).catch((error) => {
      setStatusMessage(
        error instanceof Error ? error.message : "设备提醒连接失败",
      );
    });
  }, [registration, syncExistingSubscription]);

  async function subscribePush() {
    if (!registration || !runtime.canUsePush) {
      throw new Error("当前环境暂时不能启用设备提醒。");
    }

    const existing = await registration.pushManager.getSubscription();
    const nextSubscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const serialized = serializeSubscription(nextSubscription);

    if (!serialized) {
      throw new Error("当前设备返回的 push subscription 无效。");
    }

    await persistSubscription(serialized);
    setSubscription(serialized);
    setStatusMessage("设备提醒已连接");
  }

  async function handleEnableNotifications() {
    if (runtime.needsInstallPrompt) {
      setStatusMessage("请先把网页添加到主屏幕，再从主屏幕打开。");
      return;
    }

    if (!runtime.canUsePush && runtime.permission !== "default") {
      setStatusMessage("当前环境暂时不能启用设备提醒。");
      return;
    }

    setIsBusy(true);

    try {
      const nextPermission = await Notification.requestPermission();
      const nextRuntime = detectRuntimeSupport();

      setRuntime({
        ...nextRuntime,
        permission: nextPermission,
      });

      if (nextPermission !== "granted") {
        setStatusMessage(
          nextPermission === "denied" ? "通知权限已被拒绝" : "通知权限尚未开启",
        );
        return;
      }

      await subscribePush();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "开启设备提醒失败",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSendTestPush() {
    if (!subscription) {
      setStatusMessage("请先开启设备提醒。");
      return;
    }

    setIsBusy(true);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          platform: runtime.platformLabel,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "测试推送发送失败");
      }

      setStatusMessage("测试推送已发送");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "测试推送发送失败",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDispatchDuePush() {
    setIsBusy(true);

    try {
      const response = await fetch("/api/push/dispatch-due", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            result?: {
              sentReminders: number;
              sentNotifications: number;
              skippedReason: string | null;
            };
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "到点提醒同步失败");
      }

      if (payload.result?.sentNotifications) {
        setStatusMessage(`已推送 ${payload.result.sentNotifications} 条设备提醒`);
      } else if (payload.result?.skippedReason === "no_active_subscriptions") {
        setStatusMessage("当前还没有可用的设备订阅");
      } else {
        setStatusMessage("当前没有新的到点提醒");
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "到点提醒同步失败",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "mb-4 rounded-[22px] border p-3.5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.18)] sm:mb-5 sm:rounded-[24px] sm:p-5",
<<<<<<< Updated upstream
        subscription
=======
        isGranted
>>>>>>> Stashed changes
          ? "border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#eef9f2_100%)]"
          : runtime.permission === "denied" || runtime.needsInstallPrompt
            ? "border-amber-100 bg-[linear-gradient(180deg,#fffdf8_0%,#faf4e9_100%)]"
            : "border-white/80 bg-white/92",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <Smartphone className="h-4 w-4 text-emerald-700" />
            设备提醒
          </div>
          <div className="text-[13px] leading-5 text-zinc-600 sm:text-sm sm:leading-6">
            {supportDescription}
          </div>
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] leading-5 text-zinc-500 sm:text-xs">
            <BellRing className="h-3.5 w-3.5" />
            <span className="truncate sm:max-w-none">{statusMessage}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-52">
          {runtime.permission !== "granted" || !subscription ? (
            <button
              type="button"
<<<<<<< Updated upstream
              onClick={() => void handleEnableNotifications()}
              disabled={isBusy || runtime.missingConfig || (!runtime.canUsePush && !runtime.needsInstallPrompt)}
=======
              onClick={() => void handleRequestPermission()}
              disabled={isBusy}
>>>>>>> Stashed changes
              className="inline-flex min-h-11 items-center justify-center rounded-[18px] bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_28px_-20px_rgba(16,185,129,0.75)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runtime.permission === "granted" ? "连接设备提醒" : "开启设备提醒"}
            </button>
          ) : null}

          {subscription ? (
            <>
              <button
                type="button"
                onClick={() => void handleSendTestPush()}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center rounded-[18px] bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_28px_-20px_rgba(16,185,129,0.75)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                发送测试提醒
              </button>
              <button
                type="button"
                onClick={() => void handleDispatchDuePush()}
                disabled={isBusy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                同步到点提醒
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
