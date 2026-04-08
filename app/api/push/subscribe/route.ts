import { NextRequest, NextResponse } from "next/server";

import { deactivatePushSubscription, getClientPushConfig, upsertPushSubscription } from "@/lib/push-service";
import type { BrowserPushSubscriptionPayload } from "@/lib/push-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SubscribeRequestBody = {
  subscription?: BrowserPushSubscriptionPayload;
  userAgent?: string | null;
  platform?: string | null;
  endpoint?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribeRequestBody;

    if (!body.subscription) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing subscription payload.",
        },
        { status: 400 },
      );
    }

    await upsertPushSubscription({
      subscription: body.subscription,
      userAgent: body.userAgent ?? request.headers.get("user-agent"),
      platform: body.platform ?? null,
    });

    const config = getClientPushConfig();

    return NextResponse.json({
      ok: true,
      pushConfigured: config.configured,
      publicKeyAvailable: Boolean(config.publicKey),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save push subscription.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SubscribeRequestBody;
    const endpoint = body.endpoint?.trim();

    if (!endpoint) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing endpoint.",
        },
        { status: 400 },
      );
    }

    await deactivatePushSubscription(endpoint);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to deactivate push subscription.",
      },
      { status: 500 },
    );
  }
}
