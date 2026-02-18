"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/calls": "Calls",
  "/dashboard/scripts": "AI Agents",
  "/dashboard/leads": "Leads",
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/phone-numbers": "Phone Numbers",
  "/dashboard/live": "Live Calls",
  "/dashboard/integrations": "Integrations",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  // Check for exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Check for prefix match (for nested routes)
  const matchedKey = Object.keys(pageTitles)
    .filter((key) => key !== "/dashboard")
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));

  return matchedKey ? pageTitles[matchedKey] : "Dashboard";
}

export function TopBar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#09090B] px-8">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border-zinc-800 bg-zinc-900 pl-9 text-sm placeholder:text-zinc-500"
          />
        </div>

        {/* User button */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
