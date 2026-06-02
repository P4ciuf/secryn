import type { ReactNode } from "react";
import { Link } from "react-router";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { ROUTES } from "../../../routes/paths";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Text displayed before the footer link (e.g. "Don't have an account?") */
  footerPrompt: string;
  /** Clickable link text in the footer (e.g. "Sign up") */
  footerLinkText: string;
  /** Route target for the footer link */
  footerLinkTo: string;
}

/**
 * Shared layout wrapper for authentication pages (login / register).
 *
 * Renders a centered card with branded header, form slot, footer navigation
 * link, and a "Back to home" anchor. Applies a fade-in + slide-up animation.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footerPrompt,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-slate-400">{subtitle}</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8">
          {children}

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-400">{footerPrompt} </span>
            <Link to={footerLinkTo} className="text-blue-400 hover:text-blue-300 font-medium">
              {footerLinkText}
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to={ROUTES.HOME} className="text-slate-400 hover:text-white text-sm">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
