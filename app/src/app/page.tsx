import { ROUTES } from "@/data/routes";
import { Shield } from "lucide-react";
import Link from "next/link";
import LandingHeroSection from "@/components/landing/heroSection";
import LandingwhySection from "@/components/landing/whySection";
import { features, steps } from "@/data/landing";

/** Root landing page with hero, how-it-works, features, CTA, and footer sections. */
export default function Landing() {
  return (
    <>
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">Secryn</span>
          </div>
          <div className="flex gap-4">
            <Link
              href={ROUTES.login}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href={ROUTES.register}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <LandingHeroSection />

      <LandingwhySection />

      <section className="container mx-auto px-6 py-20 bg-slate-800/30 rounded-2xl my-12">
        <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-3xl mx-auto space-y-8">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shrink-0 text-xl font-bold">
                {step.number}
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-300">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-8">Enterprise-Grade Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 items-start p-6 bg-slate-800/30 rounded-lg"
              >
                <feature.icon className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">{feature.title}</h4>
                  <p className="text-slate-300 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-linear-to-r from-blue-600 to-cyan-600 rounded-2xl p-12">
          <h2 className="text-4xl font-bold mb-4">Ready to Secure Your Secrets?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers who trust Secryn to protect their credentials.
          </p>
          <Link
            href={ROUTES.register}
            className="inline-block px-8 py-4 bg-white text-blue-600 hover:bg-slate-100 rounded-lg text-lg font-semibold transition-colors"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-700 py-8 mt-20">
        <div className="container mx-auto px-6 text-center text-slate-400">
          <p>
            Made by <a href="https://github.com/p4ciuf">P4ciuf </a>
          </p>
        </div>
      </footer>
    </>
  );
}
