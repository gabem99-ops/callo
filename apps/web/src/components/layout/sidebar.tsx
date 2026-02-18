"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  FileText,
  Users,
  Megaphone,
  PhoneCall,
  Radio,
  Plug,
  CreditCard,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  hasIndicator?: boolean;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calls", href: "/dashboard/calls", icon: Phone },
  { label: "AI Agents", href: "/dashboard/scripts", icon: FileText },
  { label: "Leads", href: "/dashboard/leads", icon: Users },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Phone Numbers", href: "/dashboard/phone-numbers", icon: PhoneCall },
  { label: "Live Calls", href: "/dashboard/live", icon: Radio, hasIndicator: true },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-zinc-800/50 bg-[#0E0E13]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Phone className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Callo
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              {/* Active left border accent */}
              {active && (
                <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-500" />
              )}

              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active
                    ? "text-indigo-400"
                    : "text-zinc-500 group-hover:text-zinc-300"
                )}
              />

              <span className="flex-1">{item.label}</span>

              {/* Green pulsing dot for Live Monitor */}
              {item.hasIndicator && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help link */}
      <div className="px-3 pb-2">
        <a
          href="#"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
        >
          <HelpCircle className="h-4 w-4" />
          Need help?
        </a>
      </div>

      {/* Bottom section -- plan info */}
      <div className="border-t border-zinc-800/50 p-4">
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-300">Starter Plan</p>
            <p className="text-xs text-zinc-500">Free tier</p>
          </div>
          <Link
            href="/dashboard/billing"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </aside>
  );
}
