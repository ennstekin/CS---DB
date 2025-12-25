import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { AuthProvider } from "@/lib/auth/context";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen relative bg-background">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Desktop Sidebar */}
        <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="md:pl-72 min-h-screen">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
