import { NextResponse } from "next/server";

import { dispatchDueReminderPushes, getClientPushConfig } from "@/lib/push-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function dispatch() {
  const config = getClientPushConfig();

  if (!config.configured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Web Push 未配置完成。请补齐 NEXT_PUBLIC_VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY 和 VAPID_SUBJECT。",
      },
      { status: 503 },
    );
  }

  const result = await dispatchDueReminderPushes();

  return NextResponse.json({
    ok: true,
    result,
  });
}

export async function GET() {
  try {
    return await dispatch();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to dispatch due push reminders.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    return await dispatch();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to dispatch due push reminders.",
      },
      { status: 500 },
    );
  }
}
