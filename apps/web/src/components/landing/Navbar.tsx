import { Link } from "react-router";
import { Shield } from "lucide-react";
import { ROUTES } from "../../routes/paths";

/**
 * Top navigation bar for the landing page
 * with links to login and registration.
 */
export function LandingNavbar() {
  return (
    <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold">SecureVault</span>
        </div>
        <div className="flex gap-4">
          <Link
            to={ROUTES.LOGIN}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            to={ROUTES.REGISTER}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
