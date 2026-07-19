"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/stores/ui";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Folder,
  User,
  Menu,
  LogOut,
  Plus,
  FileText,
  Settings,
  LayoutTemplate,
  Lightbulb,
  Search,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/credits", label: "Credits", icon: Wallet },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/contents", label: "Contents", icon: FileText },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/avatars", label: "Avatars", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  credits: "Credits",
  ideas: "Ideas",
  projects: "Projects",
  templates: "Templates",
  avatars: "Avatars",
  settings: "Settings",
  contents: "Content",
  new: "New",
};

function useSearchDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: projectsData } = useProjects();
  const projects = projectsData?.projects;
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useUIStore();
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pathSegments = pathname.split("/").filter(Boolean);

  const handleSearch = useCallback((href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  }, [router, setSearchOpen]);

  const filteredProjects = projects?.filter((p: { name: string }) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  ) ?? [];

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
        className={`flex flex-col border-r transition-all duration-300 z-50 bg-card ${
          sidebarCollapsed
            ? "w-16 max-sm:hidden"
            : sidebarOpen
              ? "w-64"
              : "w-0 -translate-x-full"
        } overflow-hidden max-sm:fixed max-sm:inset-y-0 max-sm:left-0 max-sm:z-50 max-sm:w-[85vw] max-sm:max-w-72 max-sm:shadow-2xl ${
          sidebarOpen ? "max-sm:translate-x-0" : "max-sm:-translate-x-full"
        }`}
      >
        {/* Logo */}
        <Link href="/dashboard" className={`flex h-16 items-center gap-3 border-b border-border shrink-0 ${sidebarCollapsed ? "justify-center px-0" : "px-5"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0">
            <Image
              src="/logo-256.webp"
              alt="Faceless"
              width={20}
              height={20}
              className="h-5 w-5"
            />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-foreground whitespace-nowrap">
              Faceless
            </span>
          )}
        </Link>

        {/* Sidebar collapse toggle (desktop only) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden sm:flex absolute -right-3 top-14 z-10 h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-sm"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

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
                  sidebarCollapsed ? "justify-center px-0" : ""
                } ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}

          {/* Projects section */}
          {!sidebarCollapsed && (
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
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3 shrink-0">
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
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
            {!sidebarCollapsed && (
              <>
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
              </>
            )}
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
            className="touch-target shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4 text-primary" />
          </Button>

          {/* Breadcrumb with proper links */}
          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
            </Link>
            {pathSegments.map((segment, i) => {
              const href = "/" + pathSegments.slice(0, i + 1).join("/");
              const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
              const isLast = i === pathSegments.length - 1;
              return (
                <span key={href} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-muted-foreground/50 shrink-0">/</span>
                  {isLast ? (
                    <span className="truncate max-w-[160px] text-foreground font-medium">{label}</span>
                  ) : (
                    <Link
                      href={href}
                      className="truncate max-w-[120px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Global search trigger */}
          <Button
            onClick={() => setSearchOpen(true)}
            variant="ghost"
            size="icon"
            className="touch-target shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Search (Cmd+K)"
          >
            <Search className="h-4 w-4" />
          </Button>

          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg top-[15%] sm:top-[20%]">
          <DialogHeader>
            <DialogTitle className="sr-only">Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, projects, templates..."
                className="pl-9 h-10"
                autoFocus
              />
            </div>
            {searchQuery.trim() && (
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {/* Navigate to pages */}
                {NAV_ITEMS.filter((item) =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase()),
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSearch(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left text-foreground hover:bg-muted transition-colors"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                {/* Projects */}
                {filteredProjects.map((p: { id: string; name: string }) => (
                  <button
                    key={p.id}
                    onClick={() => handleSearch(`/projects/${p.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left text-foreground hover:bg-muted transition-colors"
                  >
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>{p.name}</span>
                  </button>
                ))}
                {filteredProjects.length === 0 && NAV_ITEMS.filter((item) =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase()),
                ).length === 0 && (
                  <p className="px-3 py-4 text-sm text-center text-muted-foreground">
                    No results found
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
              <span><kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> Navigate</span>
              <span><kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> Close</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}