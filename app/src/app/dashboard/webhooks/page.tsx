import { Webhook } from "lucide-react";
import { PageHeader } from "@/components/ui/pageHeader";

/**
 * Placeholder page for webhook configuration.
 */
export default function WebhooksPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <PageHeader title="Webhooks" description="Configure real-time event notifications" />
      <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-8">
        <Webhook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-center text-slate-400">Webhook configuration coming soon.</p>
      </div>
    </div>
  );
}
