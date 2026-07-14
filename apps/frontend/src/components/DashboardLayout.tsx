"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/stores/ui";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Folder,
  User,
  Menu,
  LogOut,
  Plus,
  FileText,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/avatars", label: "Avatars", icon: User },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { data: projects } = useProjects();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r transition-all duration-300 z-50 ${
          sidebarOpen ? "w-64" : "w-0 -translate-x-full"
        } overflow-hidden border-border bg-card max-sm:fixed max-sm:inset-y-0 max-sm:left-0 max-sm:z-50 max-sm:w-[85vw] max-sm:max-w-72 max-sm:shadow-2xl ${
          sidebarOpen ? "max-sm:translate-x-0" : "max-sm:-translate-x-full"
        }`}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-border px-5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg">
            <Image
              src="/logo-256.webp"
              alt="Faceless"
              width={20}
              height={20}
              className="h-5 w-5"
            />
          </div>
          <span className="text-lg font-bold text-foreground">
            Faceless
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 640) toggleSidebar();
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground  hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Projects section */}
          <div className="pt-4">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Projects
              </span>
              <Link
                href="/dashboard?new=true"
                className="flex h-5 w-5 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-primary"
              >
                <Plus className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-0.5">
              {projects?.slice(0, 8).map((project: { id: string; name: string }) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  onClick={() => {
                    if (window.innerWidth < 640) toggleSidebar();
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    pathname === `/projects/${project.id}`
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3 shrink-0">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--accent-secondary))] text-xs font-bold text-primary-foreground shrink-0">
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.displayName || "User"}
              </p>
              <p className="truncate text-xs text-muted-foreground/70">
                {user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 sm:px-6 shrink-0">
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className="touch-target"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4 text-primary" />
          </Button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            {pathname.split("/").filter(Boolean).map((segment, i, arr) => (
              <span key={segment} className="flex items-center gap-2 min-w-0">
                {i > 0 && <span className="text-muted-foreground shrink-0">/</span>}
                <span className={`text-truncate max-w-[120px] sm:max-w-none ${
                  i === arr.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {segment.charAt(0).toUpperCase() + segment.slice(1)}
                </span>
              </span>
            ))}
          </div>

          <div className="flex-1" />

          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}