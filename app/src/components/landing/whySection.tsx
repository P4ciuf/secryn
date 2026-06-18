"use client";

import { reasons } from "@/data/landing";
import { motion } from "framer-motion";

/** "Why Secryn?" section displaying animated reason cards from landing data. */
export default function LandingwhySection() {
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
