"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  Mail,
  Users,
  RotateCcw,
  Settings,
} from "lucide-react";

const routes = [
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
    label: "Çağrılar",
    icon: Phone,
    href: "/dashboard/calls",
    disabled: true, // Yakında
  },
  {
    label: "Müşteriler",
    icon: Users,
    href: "/dashboard/customers",
    disabled: true, // Yakında
  },
  {
    label: "İadeler",
    icon: RotateCcw,
    href: "/dashboard/returns",
    disabled: true, // Yakında
  },
  {
    label: "Ayarlar",
    icon: Settings,
    href: "/dashboard/settings",
    separator: true, // Üstte çizgi olsun
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-secondary">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <h1 className="text-2xl font-bold">Smart CS</h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route, index) => (
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
    </div>
  );
}
