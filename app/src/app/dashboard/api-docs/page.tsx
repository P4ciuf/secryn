import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/pageHeader";

/**
 * Placeholder page for the API documentation section of the dashboard.
 */
export default function ApiDocsPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <PageHeader title="API Documentation" description="Reference for the Secryn REST API" />
      <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-8">
        <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-center text-slate-400">Full API documentation coming soon.</p>
      </div>
    </div>
  );
}
