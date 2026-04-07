import type { ReactNode } from "react";

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
      <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-10">
        <section className="relative mb-8 overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(247,252,249,0.9))] px-6 py-7 shadow-[0_22px_64px_-32px_rgba(15,23,42,0.28)] backdrop-blur sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_top,rgba(110,231,183,0.16),transparent_58%)] lg:block" />
          <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-amber-100/55 blur-2xl" />
          <div className="pointer-events-none absolute right-8 top-6 h-28 w-28 rounded-full bg-emerald-100/55 blur-3xl" />
          <div className="relative">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
              {eyebrow}
            </div>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl sm:leading-[1.1]">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
              {description}
            </p>
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}
