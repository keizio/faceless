"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/stores/ui";

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: projects } = useProjects();
  const { sidebarOpen } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-gray-50">
      <div className="border-b p-4">
        <Link href="/dashboard" className="text-xl font-bold">
          Faceless
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">
            Projects
          </h3>
          <ul className="space-y-1">
            {projects?.map((project: { id: string; name: string }) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className={`block rounded px-3 py-2 text-sm ${
                    pathname === `/projects/${project.id}`
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="border-t p-4">
        <button
          onClick={signOut}
          className="w-full rounded px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
