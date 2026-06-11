import { Shield, Server, Users } from "lucide-react";
import { motion } from "framer-motion";

const reasons = [
  {
    icon: Shield,
    color: "text-blue-400",
    title: "Military-Grade Security",
    description:
      "All secrets encrypted with AES-256 encryption. Your data is protected with industry-leading security standards.",
    delay: 0.1,
  },
  {
    icon: Server,
    color: "text-green-400",
    title: "Self-Hosted Control",
    description:
      "Deploy on your infrastructure. Full control over your data with no third-party dependencies.",
    delay: 0.2,
  },
  {
    icon: Users,
    color: "text-purple-400",
    title: "Team Collaboration",
    description:
      "Share secrets securely across teams. Manage access with granular permissions and audit logs.",
    delay: 0.3,
  },
];

/**
 * Three-column section explaining the product's key value propositions.
 * Cards animate into view once via Framer Motion's {@link motion.div} `whileInView`.
 */
export function WhySection() {
  return (
    <section className="container mx-auto px-6 py-20">
      <h2 className="text-4xl font-bold text-center mb-12">Why Secryn?</h2>
      <div className="grid md:grid-cols-3 gap-8">
        {reasons.map((item) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: item.delay }}
            className="p-8 bg-slate-800/50 rounded-xl border border-slate-700"
          >
            <item.icon className={`w-12 h-12 ${item.color} mb-4`} />
            <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
            <p className="text-slate-300">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
