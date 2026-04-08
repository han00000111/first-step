import { NextRequest, NextResponse } from "next/server";

import { sendTestPush } from "@/lib/push-service";
import type { BrowserPushSubscriptionPayload } from "@/lib/push-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TestPushRequestBody = {
  subscription?: BrowserPushSubscriptionPayload;
  platform?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TestPushRequestBody;

    if (!body.subscription) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing subscription payload.",
        },
        { status: 400 },
      );
    }

    const payload = await sendTestPush({
      subscription: body.subscription,
      platform: body.platform ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      payload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to send test push.",
      },
      { status: 500 },
    );
  }
}
