import { LucideIcon } from "lucide-react";

/** A "Why Secryn?" reason card with icon, styling, and a staggered animation delay. */
export type LandingReason = {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
  delay: number;
};

/** A feature card displayed in the "Enterprise-Grade Features" grid. */
export type LandingFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};
