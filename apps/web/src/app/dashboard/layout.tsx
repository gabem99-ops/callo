import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#09090B]">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main content area -- offset by sidebar width */}
      <div className="flex flex-1 flex-col pl-[280px]">
        {/* Top bar */}
        <TopBar />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
