import { Lock, Key, Code, Server } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "AES-256 Encryption",
    description: "Bank-level encryption for all stored secrets",
  },
  {
    icon: Key,
    title: "Access Control",
    description: "Role-based permissions and audit logging",
  },
  {
    icon: Code,
    title: "Developer-Friendly API",
    description: "RESTful API with comprehensive documentation",
  },
  {
    icon: Server,
    title: "Self-Hosted",
    description: "Deploy on-premise or in your cloud",
  },
];

/**
 * Highlights the platform's key technical capabilities in a grid layout.
 */
export function FeaturesSection() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-8">Enterprise-Grade Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 items-start p-6 bg-slate-800/30 rounded-lg"
            >
              <feature.icon className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-slate-300 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
