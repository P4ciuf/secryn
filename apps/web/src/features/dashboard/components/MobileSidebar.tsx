import { Shield, LogOut, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { SidebarNav } from "./SidebarNav";
import { api } from "../../../lib/api";
import { ROUTES } from "../../../routes/paths";
import { useState } from "react";

interface MobileSidebarProps {
  onClose: () => void;
}

/**
 * Slide-in sidebar for viewports below the `lg` breakpoint.
 *
 * Animated with a spring-based horizontal slide. Calls {@link onClose} on
 * navigation item clicks, the explicit close button, and logout. The logout
 * button clears the server‑side session and redirects to the login page.
 */
export function MobileSidebar({ onClose }: MobileSidebarProps) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * Calls the logout endpoint to clear the httpOnly cookie and navigates
   * to the login page. Local cleanup always proceeds even when the API call
   * fails, ensuring the UI always transitions to the login screen.
   */
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // proceed with local cleanup even if the API call fails
    }
    navigate(ROUTES.LOGIN);
  };

  return (
    <motion.aside
      initial={{ x: -256 }}
      animate={{ x: 0 }}
      exit={{ x: -256 }}
      transition={{ type: "spring", damping: 20 }}
      className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 lg:hidden"
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold">SecureVault</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <SidebarNav onItemClick={onClose} />

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
      </div>
    </motion.aside>
  );
}
