import { Outlet } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Sidebar } from "../features/dashboard/components/Sidebar";
import { MobileSidebar } from "../features/dashboard/components/MobileSidebar";
import { TopBar } from "../features/dashboard/components/TopBar";

/**
 * Layout shell for all authenticated pages.
 * Renders a persistent desktop sidebar, a hamburger-triggered mobile
 * drawer with animated overlay, a top bar, and the routed child content
 * via {@link Outlet}.
 */
export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="flex h-screen">
        <Sidebar />

        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Semi-transparent backdrop that closes the mobile menu on click */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileSidebar onClose={() => setMobileMenuOpen(false)} />
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-auto">
          <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
