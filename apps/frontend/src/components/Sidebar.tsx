"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Folder, FileText, LogOut } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: projects } = useProjects();
  const { sidebarOpen } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card border-border max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:w-[85vw] max-sm:max-w-72 max-sm:shadow-2xl">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--accent-secondary))]">
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
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
            pathname === "/dashboard"
              ? "bg-primary/10 text-primary border-l-2 border-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/projects"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
            pathname.startsWith("/projects")
              ? "bg-primary/10 text-primary border-l-2 border-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Folder className="h-4 w-4" />
          Projects
        </Link>
        <div className="pt-4">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Projects
          </h3>
          <div className="space-y-0.5">
            {projects?.slice(0, 8).map((project: { id: string; name: string }) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
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

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}