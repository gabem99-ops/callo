"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { getToken, isLoaded } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    async function check() {
      try {
        const token = await getToken();
        api.setToken(token);
        const res = await api.getBusiness();
        if (cancelled) return;
        if (res?.data && !res.data.onboardingCompleted) {
          router.replace("/onboarding");
          return;
        }
      } catch {
        // If fetch fails, let dashboard render normally
      }
      if (!cancelled) setReady(true);
    }

    check();
    return () => { cancelled = true; };
  }, [isLoaded, getToken, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return <>{children}</>;
}
