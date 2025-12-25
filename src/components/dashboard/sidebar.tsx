"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Phone,
  Mail,
  RotateCcw,
  Settings,
  Ticket,
  BarChart3,
  LogOut,
  User,
  Loader2,
} from "lucide-react";

interface Route {
  label: string;
  icon: React.ElementType;
  href: string;
  disabled?: boolean;
  separator?: boolean;
  allowedRoles?: UserRole[];
}

const routes: Route[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Mailler", icon: Mail, href: "/dashboard/mails" },
  { label: "Talepler", icon: Ticket, href: "/dashboard/tickets" },
  { label: "Çağrılar", icon: Phone, href: "/dashboard/calls" },
  { label: "İadeler", icon: RotateCcw, href: "/dashboard/returns" },
  { label: "Raporlar", icon: BarChart3, href: "/dashboard/reports", allowedRoles: ["ADMIN", "SUPERVISOR"] },
  { label: "Ayarlar", icon: Settings, href: "/dashboard/settings", separator: true, allowedRoles: ["ADMIN", "SUPERVISOR"] },
];

const roleColors: Record<UserRole, string> = {
  ADMIN: "text-red-600 bg-red-50",
  SUPERVISOR: "text-blue-600 bg-blue-50",
  AGENT: "text-green-600 bg-green-50",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, signOut, loading } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const filteredRoutes = routes.filter((route) => {
    if (!route.allowedRoles) return true;
    if (loading) return true;
    if (!appUser) return false;
    return route.allowedRoles.includes(appUser.role);
  });

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <span className="font-semibold text-lg">Smart CS</span>
        </Link>
      </div>

      {/* User Info */}
      {appUser && (
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{appUser.name}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", roleColors[appUser.role])}>
                {appUser.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="px-4 py-4 border-b flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredRoutes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <div key={route.href}>
              {route.separator && <div className="my-3 border-t" />}
              <Link
                href={route.disabled ? "#" : route.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  route.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <route.icon className="h-4 w-4" />
                {route.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}
