import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="rounded-full bg-zinc-800 p-4">
        <FileQuestion className="h-8 w-8 text-zinc-500" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">Page not found</h2>
      <p className="mt-2 text-sm text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/dashboard">
        <Button className="mt-6">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
