import { Shield, LogOut, X } from "lucide-react";
import { motion } from "framer-motion";
import { SidebarNav } from "./SidebarNav";

interface MobileSidebarProps {
  onClose: () => void;
}

/**
 * Slide-in sidebar for viewports below the `lg` breakpoint.
 *
 * Animated with a spring-based horizontal slide. Calls {@link onClose} on
 * navigation item clicks and on the explicit close button.
 */
export function MobileSidebar({ onClose }: MobileSidebarProps) {
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
          <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
