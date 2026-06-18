"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ROUTES } from "@/data/routes";

/** Animated hero section with a gradient headline, subtitle, and CTA button. */
export default function LandingHeroSection() {
  return (
    <section className="container mx-auto px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-6xl font-bold mb-6 bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Secure Your Secrets, Simplify Your Workflow
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Secryn is the modern platform for managing API keys, tokens, and credentials. Self-hosted,
          encrypted, and built for teams.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href={ROUTES.register}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-colors"
          >
            Get Started
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
