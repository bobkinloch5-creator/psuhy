import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Anvil } from "lucide-react"
import Image from "next/image"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to forge
  if (user) {
    redirect("/forge")
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-orange-600 bg-clip-text text-transparent">
                BlaxSmith AI
              </h1>
            </div>
            <a
              href="/auth/discord"
              className="px-6 py-2.5 forge-gradient text-white font-semibold rounded-lg hover:scale-105 transition-transform shadow-lg shadow-primary/50 anvil-shine"
            >
              Login with Discord
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <Image
                  src="/blaxsmith-logo.png"
                  alt="BlaxSmith Anvil"
                  width={300}
                  height={300}
                  className="w-72 h-72 drop-shadow-2xl animate-[bounce_3s_ease-in-out_infinite]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/50 to-transparent blur-2xl" />
              </div>
            </div>

            <h2 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Forge Your
              </span>
              <br />
              <span className="text-foreground">Roblox World</span>
            </h2>

            <p className="text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
              AI-powered creation studio for Roblox. Generate models, worlds, and scripts instantly. Connect directly to
              Roblox Studio and bring your imagination to life.
            </p>

            {/* CTA */}
            <a
              href="/auth/discord"
              className="inline-flex items-center gap-3 px-8 py-4 forge-gradient text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-2xl shadow-primary/50 anvil-shine"
            >
              <Anvil className="w-6 h-6" />
              Start Forging with Discord
            </a>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
              <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Anvil className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">3D Model Generation</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Describe any object and watch it materialize. Characters, props, buildings - all production-ready.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">World Generation</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Create entire environments with one prompt. Villages, dungeons, cities - complete with lighting.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Studio Integration</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Connect directly to Roblox Studio. Generate and insert assets without leaving your workspace.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div>© 2026 BlaxSmith AI. Powered by AI and passion for creation.</div>
              <div className="flex items-center gap-6">
                <a href="https://discord.gg/XMG5DbkEuB" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Support Server
                </a>
                <a href="/docs" className="hover:text-foreground transition-colors">
                  Documentation
                </a>
                <a href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </a>
                <a href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
                <a href="/faq" className="hover:text-foreground transition-colors">
                  FAQ
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
