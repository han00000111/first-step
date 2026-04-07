import { NextResponse } from "next/server";

import { getDueReminders, markRemindersAsSent } from "@/lib/reminder-service";

export const dynamic = "force-dynamic";

function trimTitle(content: string) {
  return content.length > 26 ? `${content.slice(0, 26)}...` : content;
}

export async function GET() {
  try {
    const reminders = await getDueReminders();

    await markRemindersAsSent(
      reminders.map((reminder) => ({
        taskId: reminder.taskId,
        messageShown: reminder.messageShown,
        scheduledForIso: reminder.scheduledForIso,
      })),
    );

    return NextResponse.json(
      {
        reminders: reminders.map((reminder) => ({
          taskId: reminder.taskId,
          title: trimTitle(reminder.content),
          body: reminder.messageShown,
          url: `/reminders?taskId=${reminder.taskId}`,
          tag: `first-step:${reminder.taskId}:${reminder.scheduledForIso}`,
          slotKey: `${reminder.taskId}:${reminder.scheduledForIso}`,
          scheduledForIso: reminder.scheduledForIso,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        reminders: [],
        error: error instanceof Error ? error.message : "Unknown notification sync error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
