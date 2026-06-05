import { Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { SidebarNav } from "./SidebarNav";
import { api } from "../../../lib/api";
import { ROUTES } from "../../../routes/paths";
import { useState } from "react";

/**
 * Persistent desktop sidebar shown on `lg`+ viewports.
 *
 * Contains the brand header, main navigation links, and a logout button
 * that clears the server‑side session and redirects to the login page.
 */
export function Sidebar() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * Calls the logout endpoint to clear the httpOnly cookie, removes any
   * client‑side auth token, and navigates to the login page. Local cleanup
   * always proceeds even when the API call fails.
   */
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // proceed with local cleanup even if the API call fails
    }
    localStorage.removeItem("auth_token");
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-800 border-r border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold">SecureVault</span>
        </div>
      </div>

      <SidebarNav />

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
}
