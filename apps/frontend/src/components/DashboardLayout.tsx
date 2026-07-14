"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/stores/ui";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/projects", label: "Projects", icon: "📁" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { data: projects } = useProjects();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0 -translate-x-full"
        } overflow-hidden border-[var(--border-color)] bg-[var(--bg-surface)]`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border-color)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)]">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            Faceless
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] border-l-2 border-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          {/* Projects section */}
          <div className="pt-4">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Projects
              </span>
              <Link
                href="/dashboard?new=true"
                className="flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--accent)]"
              >
                +
              </Link>
            </div>
            <div className="space-y-0.5">
              {projects?.slice(0, 8).map((project: { id: string; name: string }) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    pathname === `/projects/${project.id}`
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-xs">📄</span>
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-[var(--border-color)] p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] text-xs font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {user?.displayName || "User"}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {user?.email}
              </p>
            </div>
            <button
              onClick={signOut}
              className="flex h-7 w-7 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--error)]"
              title="Sign out"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center gap-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-6">
          <button
            onClick={toggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h12M3 9h12M3 13h12" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            {pathname.split("/").filter(Boolean).map((segment, i, arr) => (
              <span key={segment} className="flex items-center gap-2">
                {i > 0 && <span className="text-[var(--text-muted)]">/</span>}
                <span className={i === arr.length - 1 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"}>
                  {segment.charAt(0).toUpperCase() + segment.slice(1)}
                </span>
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Notification bell */}
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 1.5a5.5 5.5 0 0 0-5.5 5.5v3.5l-1.5 2.5h14l-1.5-2.5V7A5.5 5.5 0 0 0 9 1.5z" />
              <path d="M6.5 13a2.5 2.5 0 0 0 5 0" />
            </svg>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}