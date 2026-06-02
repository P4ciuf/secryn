import { Menu } from "lucide-react";

interface TopBarProps {
  onMenuClick: () => void;
}

/**
 * Thin top bar shown on mobile (`lg:hidden`) to toggle the mobile sidebar.
 */
export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 lg:hidden">
      <button onClick={onMenuClick} className="text-slate-300 hover:text-white">
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
}
