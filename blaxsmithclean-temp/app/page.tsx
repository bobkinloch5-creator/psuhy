import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Anvil, Zap, Box, Map } from "lucide-react"
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
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-20 left-10 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/50 to-red-500/50 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-[700px] h-[700px] bg-gradient-to-br from-yellow-500/40 to-orange-500/40 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Grid overlay for depth */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />

      <div className="relative z-10">
        <header className="border-b border-border/50 backdrop-blur-2xl bg-black/30 sticky top-0 z-50 shadow-2xl shadow-orange-500/10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/blaxsmith-logo.png"
                alt="BlaxSmith AI"
                width={48}
                height={48}
                className="w-12 h-12 drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-orange-600 bg-clip-text text-transparent">
                BlaxSmith AI
              </h1>
            </div>
            <a
              href="/auth/discord"
              className="px-6 py-2.5 roblox-gradient text-white font-semibold rounded-lg hover:scale-105 transition-all shadow-lg shadow-orange-500/30 anvil-shine"
            >
              Login with Discord
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-20">
          <div className="text-center max-w-5xl mx-auto">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <Image
                  src="/blaxsmith-logo.png"
                  alt="BlaxSmith Anvil"
                  width={320}
                  height={320}
                  className="w-80 h-80 drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/60 via-red-500/40 to-transparent blur-3xl animate-pulse" />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-yellow-500/30 via-orange-500/20 to-transparent blur-2xl animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                />
              </div>
            </div>

            <h2 className="text-6xl md:text-8xl font-black mb-6 tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-orange-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-2xl text-glow">
                Forge Your
              </span>
              <br />
              <span className="text-foreground drop-shadow-xl">Roblox World</span>
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-12 max-w-3xl mx-auto font-light">
              AI-powered creation studio for Roblox. Generate models, worlds, and scripts instantly. Connect directly to
              Roblox Studio and bring your imagination to life.
            </p>

            <a
              href="/auth/discord"
              className="inline-flex items-center gap-3 px-10 py-5 roblox-gradient text-white text-lg font-bold rounded-xl hover:scale-105 transition-all shadow-2xl shadow-orange-500/50 anvil-shine mb-8 relative overflow-hidden group"
            >
              <Anvil className="w-7 h-7" />
              <span className="relative z-10">Start Forging with Discord</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </a>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
              <div className="premium-card rounded-2xl p-8 hover:border-orange-500/50 transition-all group hover:scale-[1.03] cursor-pointer">
                <div className="w-16 h-16 roblox-gradient rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all shadow-2xl shadow-orange-500/50">
                  <Box className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">3D Model Generation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Describe any object and watch it materialize. Characters, props, buildings - all production-ready.
                </p>
              </div>

              <div className="premium-card rounded-2xl p-8 hover:border-yellow-500/50 transition-all group hover:scale-[1.03] cursor-pointer">
                <div className="w-16 h-16 gold-gradient rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all shadow-2xl shadow-yellow-500/50">
                  <Map className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">World Generation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Create entire environments with one prompt. Villages, dungeons, cities - complete with lighting.
                </p>
              </div>

              <div className="premium-card rounded-2xl p-8 hover:border-red-500/50 transition-all group hover:scale-[1.03] cursor-pointer">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all shadow-2xl shadow-red-500/50">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Studio Integration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Connect directly to Roblox Studio. Generate and insert assets without leaving your workspace.
                </p>
              </div>
            </div>

            <div className="mt-32 mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 premium-card rounded-full mb-8">
                <span className="text-foreground font-semibold">Trusted by Roblox Creators</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="premium-card rounded-xl p-6 text-left hover:scale-[1.02] transition-all cursor-default">
                  <p className="text-muted-foreground mb-4 italic leading-relaxed">
                    "BlaxSmith AI saved me weeks of work. I generated an entire medieval castle in minutes!"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 roblox-gradient rounded-full shadow-lg shadow-orange-500/50" />
                    <div>
                      <div className="text-foreground font-semibold">Alex Chen</div>
                      <div className="text-sm text-muted-foreground">Game Developer</div>
                    </div>
                  </div>
                </div>
                <div className="premium-card rounded-xl p-6 text-left hover:scale-[1.02] transition-all cursor-default">
                  <p className="text-muted-foreground mb-4 italic leading-relaxed">
                    "The AI toolbox feature is incredible. Finding and inserting assets has never been easier."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gold-gradient rounded-full shadow-lg shadow-yellow-500/50" />
                    <div>
                      <div className="text-foreground font-semibold">Sarah Johnson</div>
                      <div className="text-sm text-muted-foreground">3D Artist</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-20 backdrop-blur-sm bg-black/20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div>© 2026 BlaxSmith AI. Powered by AI and passion for creation.</div>
              <div className="flex items-center gap-6">
                <a
                  href="https://discord.gg/XMG5DbkEuB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors font-semibold flex items-center gap-2"
                >
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
