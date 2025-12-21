"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, UserRole } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Mailler",
    icon: Mail,
    href: "/dashboard/mails",
  },
  {
    label: "Talepler",
    icon: Ticket,
    href: "/dashboard/tickets",
  },
  {
    label: "Çağrılar",
    icon: Phone,
    href: "/dashboard/calls",
  },
  {
    label: "İadeler",
    icon: RotateCcw,
    href: "/dashboard/returns",
  },
  {
    label: "Raporlar",
    icon: BarChart3,
    href: "/dashboard/reports",
    allowedRoles: ["ADMIN", "SUPERVISOR"],
  },
  {
    label: "Ayarlar",
    icon: Settings,
    href: "/dashboard/settings",
    separator: true,
    allowedRoles: ["ADMIN", "SUPERVISOR"],
  },
];

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  SUPERVISOR: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  AGENT: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  AGENT: "Agent",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, signOut, loading } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  // Filter routes based on user role
  // Show all routes while loading, filter after user data is available
  const filteredRoutes = routes.filter((route) => {
    if (!route.allowedRoles) return true;
    if (loading) return true; // Show all routes while loading
    if (!appUser) return false;
    return route.allowedRoles.includes(appUser.role);
  });

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-secondary">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-10">
          <img src="/logo.png" alt="PAEN" className="h-14 w-auto" />
        </Link>

        {/* User Info Section */}
        <div className="px-3 py-4 mb-6 bg-background/50 rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : appUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{appUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {appUser.email}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn("text-xs", roleBadgeColors[appUser.role])}
              >
                {roleLabels[appUser.role]}
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          {filteredRoutes.map((route) => (
            <div key={route.href}>
              {route.separator && (
                <div className="my-4 border-t border-border" />
              )}
              <Link
                href={route.disabled ? "#" : route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                  pathname === route.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground",
                  route.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center flex-1">
                  <route.icon className={cn("h-5 w-5 mr-3")} />
                  {route.label}
                  {route.disabled && (
                    <span className="ml-auto text-xs">(Yakında)</span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Logout Section */}
      <div className="px-3 py-2 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}
