import { Link } from "react-router";
import { ROUTES } from "../../routes/paths";

/**
 * Call-to-action section displayed near the bottom of the landing page,
 * prompting visitors to register.
 */
export function CTASection() {
  return (
    <section className="container mx-auto px-6 py-20 text-center">
      <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12">
        <h2 className="text-4xl font-bold mb-4">Ready to Secure Your Secrets?</h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of developers who trust Secryn to protect their credentials.
        </p>
        <Link
          to={ROUTES.REGISTER}
          className="inline-block px-8 py-4 bg-white text-blue-600 hover:bg-slate-100 rounded-lg text-lg font-semibold transition-colors"
        >
          Get Started Now
        </Link>
      </div>
    </section>
  );
}
