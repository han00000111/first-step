"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BellRing, ListTodo, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "录入", icon: Sparkles },
  { href: "/tasks", label: "任务", icon: ListTodo },
  { href: "/reminders", label: "提醒", icon: BellRing },
  { href: "/dashboard", label: "看板", icon: BarChart3 },
];

export function TopNav() {
  const pathname = usePathname();
  const currentItem = navItems.find((item) =>
    item.href === "/" ? pathname === item.href : pathname.startsWith(item.href),
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/70 bg-[rgba(249,247,240,0.92)] backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-base font-semibold tracking-tight text-zinc-900">
              第一步
            </div>
            <div className="text-xs text-zinc-500">先开始一点，再慢慢展开</div>
          </div>
          <div className="rounded-full border border-[#d7e1dc] bg-[#f1f5f2] px-3 py-1 text-xs font-medium text-[#5f7369]">
            {currentItem?.label ?? "录入"}
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-30 hidden border-b border-white/70 bg-[rgba(249,247,240,0.86)] backdrop-blur md:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight text-zinc-900">第一步</div>
              <div className="text-xs text-zinc-600">面向拖延型用户的低阻力启动提醒器</div>
            </div>
            <div className="rounded-full border border-[#d7e1dc] bg-[#f1f5f2] px-3 py-1 text-xs font-medium text-[#5f7369]">
              聚焦开始，不追踪完成
            </div>
          </div>
          <nav className="flex items-center gap-2 rounded-full border border-[#dfe6e2] bg-white/95 p-1.5 shadow-[0_10px_32px_-22px_rgba(15,23,42,0.2)]">
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full border border-transparent px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-[#f1f5f2] hover:text-zinc-900",
                    isActive &&
                      "border-[#d5ded8] bg-[linear-gradient(135deg,#f8faf8_0%,#edf2ef_100%)] text-[#54695f] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-[#e0e6e2] bg-[rgba(255,253,248,0.97)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-12px_30px_-24px_rgba(15,23,42,0.3)] backdrop-blur md:hidden">
        <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-[20px] border border-transparent px-2 py-2 text-[11px] font-medium text-zinc-500 transition-colors",
                  isActive &&
                    "border-[#d5ded8] bg-[linear-gradient(180deg,#f8faf8_0%,#edf2ef_100%)] text-[#54695f] shadow-[0_12px_24px_-22px_rgba(97,120,109,0.38)]",
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-[#62786d]" : "text-zinc-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
