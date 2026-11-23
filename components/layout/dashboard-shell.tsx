"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActiveChildProvider, ChildSummary } from "@/contexts/active-child";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Menu, CalendarCheck, LayoutDashboard, TrendingUp, Flower2, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const BOTTOM_NAV = [
  { href: "/dashboard",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/progress", label: "Progress",  icon: TrendingUp },
  { href: "/dashboard/bloom",    label: "Bloom",     icon: Flower2 },
  { href: "/dashboard/journal",  label: "Journal",   icon: BookOpen },
  { href: "/dashboard/settings", label: "Settings",  icon: Settings },
];

interface DashboardShellProps {
  children: React.ReactNode;
  allChildren: ChildSummary[];
  subscriptionTier: string;
}

export function DashboardShell({
  children,
  allChildren,
  subscriptionTier,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ActiveChildProvider allChildren={allChildren}>
      <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — desktop only */}
        <div
          className={[
            "fixed inset-y-0 left-0 z-30 md:relative md:flex",
            "transition-transform duration-200 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ].join(" ")}
        >
          <Sidebar
            subscriptionTier={subscriptionTier}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile topbar */}
          <div className="h-14 md:hidden flex items-center px-4 bg-white border-b border-[hsl(var(--border))] shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="mr-3 h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg planned-gradient flex items-center justify-center">
                <CalendarCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-brand-green-deep text-sm">
                Planned
              </span>
            </div>
          </div>

          {/* Scrollable page content — extra bottom padding on mobile for bottom nav */}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
        </div>

        {/* ── Mobile bottom navigation bar ─────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[hsl(var(--border))] flex items-stretch h-16 safe-area-inset-bottom">
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-brand-green"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    active ? "text-brand-green" : "text-muted-foreground"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </ActiveChildProvider>
  );
}
