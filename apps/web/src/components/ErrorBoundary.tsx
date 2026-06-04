import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Global error boundary used by every route definition in {@code routes.ts}.
 *
 * Handles four error shapes in priority order:
 * 1. {@code RouteErrorResponse} — renders the HTTP status code/text and an optional data.message
 * 2. {@code Error} instances — renders {@code error.message}
 * 3. Strings — renders the string directly
 * 4. Everything else — renders a generic "Unexpected Error" with a fallback message
 *
 * Provides a "Go Back" button that navigates to the previous route and a "Retry"
 * button that reloads the current page.
 */
export default function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Unexpected Error";
  let message = "Something went wrong. Please try again.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message ?? message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-900/30 border border-red-700 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-slate-400">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
