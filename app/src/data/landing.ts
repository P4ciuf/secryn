import { LandingFeature, LandingReason } from "@/types/landing";
import { Shield, Server, Users, Key, Code, Lock } from "lucide-react";

export const reasons: LandingReason[] = [
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

export const steps = [
  {
    number: 1,
    title: "Create Projects",
    description:
      "Organize your secrets by project or environment. Keep development, staging, and production separate.",
  },
  {
    number: 2,
    title: "Store Secrets Securely",
    description:
      "Add API keys, tokens, and credentials. Everything is encrypted at rest and in transit using AES-256.",
  },
  {
    number: 3,
    title: "Access Anywhere",
    description:
      "Retrieve secrets via CLI, API, or web interface. Integrate seamlessly with your existing workflow.",
  },
];

export const features: LandingFeature[] = [
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
