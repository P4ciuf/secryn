import { Shield, LogOut } from "lucide-react";
import { SidebarNav } from "./SidebarNav";

/**
 * Persistent desktop sidebar shown on `lg`+ viewports.
 *
 * Contains the brand header, main navigation links, and a logout button.
 */
export function Sidebar() {
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
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
