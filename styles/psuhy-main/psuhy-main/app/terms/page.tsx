import Link from "next/link"
import Image from "next/image"
import { Footer } from "@/components/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
              BlaxSmith AI
            </h1>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <p className="text-zinc-400 mb-8">Last updated: January 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-zinc-400">
              By accessing or using BlaxSmith AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p className="text-zinc-400">
              BlaxSmith AI provides AI-powered tools for Roblox game development, including but not limited to AI chat assistance, 3D model generation, and a Roblox Studio plugin for seamless integration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
            <p className="text-zinc-400">You are responsible for:</p>
            <ul className="list-disc list-inside text-zinc-400 mt-4 space-y-2">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Acceptable Use</h2>
            <p className="text-zinc-400">You agree not to:</p>
            <ul className="list-disc list-inside text-zinc-400 mt-4 space-y-2">
              <li>Use the service for any illegal purpose</li>
              <li>Generate content that violates Roblox Community Standards</li>
              <li>Attempt to reverse engineer our AI systems</li>
              <li>Share or sell generated content claiming it as your own creation without our service</li>
              <li>Abuse or exploit the credit system</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property</h2>
            <p className="text-zinc-400">
              Content you generate using BlaxSmith AI may be used in your Roblox games. However, BlaxSmith AI retains rights to the underlying technology, models, and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
            <p className="text-zinc-400">
              BlaxSmith AI is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Contact</h2>
            <p className="text-zinc-400">
              Questions? Contact us at{" "}
              <a href="mailto:support@blaxsmith.dev" className="text-orange-400 hover:underline">support@blaxsmith.dev</a>
              {" "}or join our{" "}
              <a href="https://discord.gg/xdFVu6cagw" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Discord</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
