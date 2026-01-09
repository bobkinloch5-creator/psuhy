import Image from "next/image"
import Link from "next/link"

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 6, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect the following information when you use BlaxSmith AI:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Discord account information (username, ID, avatar)</li>
              <li>Generation prompts and created content</li>
              <li>Usage statistics and generation history</li>
              <li>Roblox Studio connection data (when plugin is active)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Your information is used to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide and improve the Service</li>
              <li>Generate AI-powered content based on your prompts</li>
              <li>Maintain your generation history and credits</li>
              <li>Communicate Service updates and features</li>
              <li>Train and improve our AI models</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Data Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using Supabase infrastructure with encryption at rest and in transit. We
              retain your generation history and account data for as long as your account is active.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">BlaxSmith AI integrates with:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Discord for authentication</li>
              <li>PollyPizza for 3D model generation</li>
              <li>OpenAI for script and world generation</li>
              <li>Supabase for data storage</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              These services have their own privacy policies which govern their use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We may share your data with third-party AI providers solely for
              the purpose of generating content you request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your generated content</li>
              <li>Opt out of data collection for AI training</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies for authentication, session management, and analytics. You can
              control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              BlaxSmith AI is not intended for users under 13. If you believe a child has provided us with personal
              information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">9. Changes to Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. We will notify users of significant changes via email or
              Service notification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy concerns or data requests, contact us at privacy@blaxsmith.dev or through our Discord
              community.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
