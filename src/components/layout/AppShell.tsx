"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FilePlus2,
  History,
  LayoutDashboard,
  Menu,
  ScrollText,
  X,
} from "lucide-react";
import { ORG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports/new", label: "New Daily Report", icon: FilePlus2 },
  { href: "/reports", label: "Report History", icon: History },
  { href: "/audit", label: "Audit Trail", icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  if (href === "/reports") return pathname === "/reports" || (/^\/reports\/[^/]+/.test(pathname) && pathname !== "/reports/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navLink = (item: (typeof NAV)[number]) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-white/15 text-white" : "text-violet-100/80 hover:bg-white/10 hover:text-white",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-[18px] w-[18px]" />
        {item.label}
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-5 pt-5">
        <div className="rounded-full bg-white p-0.5">
          <Image src="/logo.png" alt="GVBL logo" width={40} height={40} className="rounded-full" priority />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[13px] font-bold tracking-wide text-white">GENOMIC VALLEY</p>
          <p className="text-[11px] text-violet-200">{ORG.defaultDepartment}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">Operations</p>
        {NAV.map(navLink)}
      </nav>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-[11px] font-semibold text-violet-100">{ORG.displayName}</p>
        <p className="text-[11px] italic text-violet-300">{ORG.tagline}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 bg-gradient-to-b from-violet-800 to-violet-900 lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-rule bg-white px-4 py-2.5 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded p-1.5 text-ink hover:bg-mist" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Image src="/logo.png" alt="" width={28} height={28} className="rounded-full" />
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-violet-700" /> Lab Operations
        </span>
      </header>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-violet-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-violet-800 to-violet-900 shadow-pop">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 rounded p-1 text-violet-100 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
