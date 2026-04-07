import type { ReactNode } from "react";

import { DeviceNotificationBanner } from "@/components/device-notification-banner";
import { TopNav } from "@/components/top-nav";

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AppShell({
  eyebrow,
  title,
  description,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-36 pt-4 sm:px-6 md:pb-16 md:pt-6 lg:px-8 lg:pt-8">
        <section className="relative mb-5 overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(245,251,247,0.96))] px-5 py-5 shadow-[0_22px_64px_-36px_rgba(15,23,42,0.24)] backdrop-blur sm:px-7 sm:py-7 md:mb-8 md:rounded-[32px] md:px-8 md:py-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_top,rgba(110,231,183,0.16),transparent_58%)] lg:block" />
          <div className="pointer-events-none absolute -left-10 top-6 h-24 w-24 rounded-full bg-amber-100/55 blur-2xl md:h-28 md:w-28" />
          <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full bg-emerald-100/55 blur-3xl md:right-8 md:top-6 md:h-28 md:w-28" />
          <div className="relative">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-700 sm:text-xs">
              {eyebrow}
            </div>
            <h1 className="mt-2 max-w-4xl text-[1.75rem] font-semibold tracking-tight text-zinc-900 sm:mt-3 sm:text-4xl sm:leading-[1.1]">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:mt-4 sm:text-base sm:leading-7">
              {description}
            </p>
          </div>
        </section>
        <DeviceNotificationBanner />
        {children}
      </main>
    </div>
  );
}
