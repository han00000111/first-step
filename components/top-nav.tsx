"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "录入" },
  { href: "/tasks", label: "任务" },
  { href: "/reminders", label: "提醒" },
  { href: "/dashboard", label: "看板" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-[rgba(246,248,244,0.82)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold tracking-tight text-zinc-900">第一步</div>
            <div className="text-xs text-zinc-600">低阻力启动提醒器 MVP</div>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            聚焦开始，而不是完成
          </div>
        </div>
        <nav className="flex items-center gap-2 overflow-x-auto rounded-full border border-emerald-100 bg-white/95 p-1.5 shadow-[0_10px_32px_-22px_rgba(15,23,42,0.35)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full border border-transparent px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-emerald-50 hover:text-zinc-900",
                  isActive &&
                    "border-emerald-200 bg-[linear-gradient(135deg,#f6fffb_0%,#dbf6ea_100%)] text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
