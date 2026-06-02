import { Link } from "react-router";
import { AlertCircle } from "lucide-react";

/**
 * Generic 404 page rendered for unknown routes.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center px-6">
      <div className="text-center">
        <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-2xl text-slate-300 mb-8">Page not found</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
