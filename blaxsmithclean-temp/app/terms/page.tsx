import Image from "next/image"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              BlaxSmith AI
            </h1>
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 6, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using BlaxSmith AI ("the Service"), you accept and agree to be bound by the terms and
              provision of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              BlaxSmith AI provides AI-powered tools for generating 3D models, worlds, scripts, and game systems for
              Roblox. The Service includes web-based interfaces and Roblox Studio plugin integration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use BlaxSmith AI, you must authenticate using Discord OAuth. By creating an account, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Not share your account with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Generation Credits & Usage</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Users receive 50 generation credits per month. Credits are used for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>3D model generation (1 credit per model)</li>
              <li>World generation (1 credit per world)</li>
              <li>Script generation (1 credit per script)</li>
              <li>System generation (1 credit per system)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Credits reset on the first day of each month and do not roll over.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Content Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain all rights to the content you generate using BlaxSmith AI. However, by using the Service, you
              grant us a worldwide, non-exclusive license to use, store, and process your prompts and generated content
              to improve our AI models and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to use BlaxSmith AI to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Generate inappropriate, offensive, or illegal content</li>
              <li>Attempt to reverse engineer or exploit the Service</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Generate content that violates Roblox Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Roblox Compliance</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              BlaxSmith AI is a third-party tool for Roblox game development. By using this service, you also agree to comply with all Roblox policies and guidelines:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <a href="https://www.roblox.com/info/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  Roblox Terms of Use
                </a>
              </li>
              <li>
                <a href="https://en.help.roblox.com/hc/en-us/articles/203313410" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  Roblox Community Standards
                </a>
              </li>
              <li>
                <a href="https://www.roblox.com/info/developer-terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  Roblox Developer Terms
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You are solely responsible for ensuring that all content generated through BlaxSmith AI complies with Roblox policies. We are not affiliated with or endorsed by Roblox Corporation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">8. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain Service availability but do not guarantee uninterrupted access. We reserve the right
              to modify, suspend, or discontinue any part of the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              BlaxSmith AI is provided "as is" without warranties of any kind. We are not liable for any damages
              resulting from use of the Service, including but not limited to data loss, project corruption, or Roblox
              account issues.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms of Service at any time. Continued use of the Service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please join our Discord support server at <a href="https://discord.gg/a6wZ2w3vZd" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://discord.gg/a6wZ2w3vZd</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
