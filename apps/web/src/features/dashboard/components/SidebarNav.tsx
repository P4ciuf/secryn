import { Link, useLocation } from "react-router";
import { FolderKey, Settings, Key, Book, Webhook } from "lucide-react";
import { ROUTES } from "../../../routes/paths";

/** Shared navigation configuration consumed by both desktop and mobile sidebar variants. */
const navItems = [
  { path: ROUTES.PROJECTS, icon: FolderKey, label: "Projects" },
  { path: ROUTES.API_KEYS, icon: Key, label: "API Keys" },
  { path: ROUTES.API_DOCS, icon: Book, label: "API Docs" },
  { path: ROUTES.WEBHOOKS, icon: Webhook, label: "Webhooks" },
  { path: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
];

interface SidebarNavProps {
  /** Optional callback fired after a nav item is clicked (e.g. to close a mobile drawer) */
  onItemClick?: () => void;
}

/**
 * Primary navigation list rendered inside both desktop and mobile sidebars.
 *
 * Highlights the active route by matching the current path prefix.
 */
export function SidebarNav({ onItemClick }: SidebarNavProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="flex-1 p-4 space-y-2">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onItemClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isActive(item.path)
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
