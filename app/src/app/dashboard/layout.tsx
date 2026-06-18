"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  LayoutDashboard,
  FolderKanban,
  Key,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import { ROUTES } from "@/data/routes";
import { apiFetch } from "@/lib/api";

const NAV_ITEMS = [
  {
    href: ROUTES.dashboard.path,
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: `${ROUTES.dashboard.path}/${ROUTES.dashboard.children.projects}`,
    label: "Projects",
    icon: FolderKanban,
  },
  {
    href: `${ROUTES.dashboard.path}/${ROUTES.dashboard.children.apiKeys}`,
    label: "API Keys",
    icon: Key,
  },
  {
    href: `${ROUTES.dashboard.path}/${ROUTES.dashboard.children.apiDocs}`,
    label: "API Docs",
    icon: BookOpen,
  },
  {
    href: `${ROUTES.dashboard.path}/${ROUTES.dashboard.children.settings}`,
    label: "Settings",
    icon: Settings,
  },
];

/**
 * Dashboard shell with a collapsible sidebar navigation. Highlights the active
 * route using path-based matching: the Overview link only activates on an
 * exact match to `/dashboard`, while sub-pages match their prefix.
 *
 * Fetches the current user's email on mount for display in the sidebar footer.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    apiFetch<{ user: { email: string; username: string } }>("/users/me")
      .then((res) => {
        if (res.user?.email) setUserEmail(res.user.email);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // continue even if logout fails
    }
    router.push(ROUTES.landing);
    router.refresh();
  }

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === ROUTES.dashboard.path) return false;
    return pathname.startsWith(href + "/");
  };

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href={ROUTES.dashboard.path} className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-400" />
          <span className="text-xl font-bold">Secryn</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-blue-600/20 text-blue-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-2 px-3">
          <p className="text-xs text-slate-500 truncate">{userEmail || "Loading..."}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-slate-900 border-r border-slate-700">
        {SidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-700 z-50">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900">
          <Link href={ROUTES.dashboard.path} className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <span className="text-lg font-bold">Secryn</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
