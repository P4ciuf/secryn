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
import { logoutAction, resendVerificationEmailAction } from "@/app/(auth)/actions";

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
 * Authenticated shell that wraps every page under `/dashboard`.
 *
 * **Sidebar** — renders the same `SidebarContent` block in two places: a
 * persistent 256px-wide column on desktop (hidden below `lg:`) and a
 * full-screen overlay triggered by the hamburger menu on mobile.
 *
 * **Active route** — the Overview link is active only on the exact dashboard
 * path (`/dashboard`); every other nav item matches by prefix
 * (`/dashboard/projects`, `/dashboard/projects/123/secrets`, and so on). See
 * {@link isActive}.
 *
 * **User data** — fetches `/users/me` on mount to display the current email
 * in the sidebar footer and to decide whether the unverified-account warning
 * banner should be shown. Requests that fail are silently absorbed. The
 * fetch outcome is tracked in `isLoadingUser` to defer redirect decisions
 * until the response arrives.
 *
 * **Unverified redirect** — once user data finishes loading, unverified
 * users navigating to the API Keys page (`/dashboard/api-keys`) are
 * immediately redirected back to `/dashboard`. Individual nav items for
 * blocked routes (see {@link isDisabled}) are rendered as disabled links
 * with `aria-disabled="true"` and are excluded from active-route
 * highlighting.
 *
 * **Logout** — calls {@link logoutAction} and redirects to the landing page
 * even if the server-side logout fails (the local session cookie is cleared
 * by the action).
 *
 * @param children - The page content rendered inside the layout shell.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    apiFetch<{ user: { email: string; username: string; isVerified: boolean } }>("/users/me")
      .then((res) => {
        if (res.user?.email) setUserEmail(res.user.email);
        setIsVerified(res.user?.isVerified);
      })
      .catch(() => {})
      .finally(() => setIsLoadingUser(false));
  }, []);

  useEffect(() => {
    if (isLoadingUser) return;
    if (!isVerified && pathname.includes(ROUTES.dashboard.children.apiKeys)) {
      router.push(ROUTES.dashboard.path);
    }
  }, [isVerified, isLoadingUser, pathname]);

  /** Perform a client-side logout and always redirect to the landing page.
   *
   *  The server action's result is deliberately ignored — the user is sent
   *  to the landing page even if the server-side session-destruction fails,
   *  because {@link logoutAction} already clears the local cookie. */
  async function handleLogout() {
    try {
      await logoutAction();
    } catch {
      // continue even if logout fails
    }
    router.push(ROUTES.landing);
    router.refresh();
  }

  const isDisabled = (href: string) =>
    !isVerified && href.includes(ROUTES.dashboard.children.apiKeys);

  const isActive = (href: string) => {
    if (isDisabled(href)) return false;
    if (pathname === href) return true;
    if (href === ROUTES.dashboard.path) return false;
    return pathname.startsWith(href + "/");
  };

  const warningNotVerifiedContent = (
    <div className=" px-3 py-2.5 rounded-b-lg rounded-e-lg text-sm font-medium bg-slate-800">
      <h1 className="text-xl">Get verified!</h1>
      <p>
        You have limited functionality until you verify your account. If you do not verify it,
        <span className="text-red-400 font-medium">
          {" "}
          your account will be deleted within 72 hours of registration
        </span>
      </p>
      <button
        onClick={resendVerificationEmailAction}
        className="text-blue-400 hover:text-blue-500 underline cursor-pointer"
      >
        Resend verification email
      </button>
      <br />
      <span className="text-slate-400 text-sm">
        An email was sent to you right after you registered
      </span>
    </div>
  );

  {
    /* Reusable sidebar block rendered in two slots: desktop persistent
      column and mobile overlay (toggled by the hamburger menu). */
  }
  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href={ROUTES.dashboard.path} className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-400" />
          <span className="text-xl font-bold">Secryn</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const disabled = isDisabled(item.href);
          return (
            <Link
              key={item.href}
              href={disabled ? "#" : item.href}
              onClick={(e) => {
                if (disabled) {
                  e.preventDefault();
                  return;
                }
                setSidebarOpen(false);
              }}
              aria-disabled={disabled}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                disabled
                  ? "text-slate-500 cursor-not-allowed opacity-50"
                  : isActive(item.href)
                    ? "bg-blue-600/20 text-blue-400 cursor-pointer"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-2 px-3">
          <p className="text-xs text-slate-500 truncate">{userEmail || "Loading..."}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full cursor-pointer"
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

        <main className="flex-1 overflow-y-auto">
          {!isVerified && warningNotVerifiedContent}
          {children}
        </main>
      </div>
    </div>
  );
}
