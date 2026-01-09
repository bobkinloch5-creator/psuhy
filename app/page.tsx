import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Anvil, Zap, Box, Map, Sparkles, ArrowRight } from "lucide-react"
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
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gradient-radial from-orange-600/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-radial from-red-600/15 via-transparent to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-radial from-yellow-600/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/blaxsmith-logo.png"
                alt="BlaxSmith AI"
                width={48}
                height={48}
                className="w-12 h-12"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
                BlaxSmith AI
              </h1>
            </div>
            <a
              href="/auth/discord"
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Login with Discord
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 pt-16 pb-8">
          <div className="text-center max-w-6xl mx-auto">
            {/* Logo with proper styling */}
            <div className="mb-10 flex justify-center">
              <div className="relative">
                <Image
                  src="/blaxsmith-logo.png"
                  alt="BlaxSmith Anvil"
                  width={280}
                  height={280}
                  className="w-64 h-64 md:w-72 md:h-72 animate-[float_4s_ease-in-out_infinite]"
                  style={{
                    filter: 'drop-shadow(0 0 80px rgba(249, 115, 22, 0.6))'
                  }}
                  priority
                />
              </div>
            </div>

            {/* Hero Text */}
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-none">
              <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Forge Your
              </span>
              <br />
              <span className="text-white">Roblox World</span>
            </h2>

            <p className="text-lg md:text-xl text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto">
              The world&apos;s best AI-powered Roblox game builder. Generate stunning 3D models,
              entire game worlds, and connect directly to Roblox Studio. Trusted by thousands.
            </p>

            {/* CTA Button */}
            <a
              href="/auth/discord"
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white text-xl font-bold rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-orange-500/40 mb-20 group"
            >
              <Anvil className="w-7 h-7" />
              Start Creating Now
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Feature Cards with Images */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              {/* 3D Models Card */}
              <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all group hover:scale-[1.02] cursor-pointer shadow-xl">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src="/feature-models.png"
                    alt="3D Models"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
                    <Box className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">3D Model Generation</h3>
                  <p className="text-zinc-400 text-sm">
                    Describe any object and watch it materialize. Characters, weapons, vehicles - all game-ready.
                  </p>
                </div>
              </div>

              {/* World Generation Card */}
              <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl overflow-hidden border border-white/10 hover:border-yellow-500/50 transition-all group hover:scale-[1.02] cursor-pointer shadow-xl">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src="/feature-worlds.png"
                    alt="World Generation"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/30">
                    <Map className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">World Generation</h3>
                  <p className="text-zinc-400 text-sm">
                    Create entire environments with AI. Fantasy islands, sci-fi bases, adventure maps - complete worlds.
                  </p>
                </div>
              </div>

              {/* Studio Integration Card */}
              <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl overflow-hidden border border-white/10 hover:border-red-500/50 transition-all group hover:scale-[1.02] cursor-pointer shadow-xl">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src="/feature-studio.png"
                    alt="Studio Integration"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/30">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Studio Integration</h3>
                  <p className="text-zinc-400 text-sm">
                    Connect directly to Roblox Studio. One-click insert for models and assets into your game.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-black text-orange-500 mb-2">10K+</div>
                <div className="text-zinc-500 text-sm">Models Generated</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-yellow-500 mb-2">500+</div>
                <div className="text-zinc-500 text-sm">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black text-red-500 mb-2">4.9★</div>
                <div className="text-zinc-500 text-sm">User Rating</div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="mt-24 max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center text-white mb-4">How It Works</h2>
              <p className="text-zinc-400 text-center mb-12">From idea to in-game in seconds</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Step 1 */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div className="text-orange-400 text-sm font-semibold mb-1">Step 1</div>
                  <h3 className="text-white font-bold mb-1">Install Plugin</h3>
                  <p className="text-zinc-500 text-sm">Add BlaxSmith to Roblox Studio</p>
                </div>

                {/* Step 2 */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center border border-yellow-500/30">
                    <Zap className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="text-orange-400 text-sm font-semibold mb-1">Step 2</div>
                  <h3 className="text-white font-bold mb-1">Connect Account</h3>
                  <p className="text-zinc-500 text-sm">Link your Discord ID</p>
                </div>

                {/* Step 3 */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                    <Sparkles className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="text-orange-400 text-sm font-semibold mb-1">Step 3</div>
                  <h3 className="text-white font-bold mb-1">Describe Asset</h3>
                  <p className="text-zinc-500 text-sm">Tell AI what you want</p>
                </div>

                {/* Step 4 */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-orange-400 text-sm font-semibold mb-1">Step 4</div>
                  <h3 className="text-white font-bold mb-1">Auto-Insert</h3>
                  <p className="text-zinc-500 text-sm">Assets appear in Studio</p>
                </div>
              </div>
            </div>

            {/* Created with BlaxSmith Gallery */}
            <div className="mt-24 max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center text-white mb-4">Created with BlaxSmith</h2>
              <p className="text-zinc-400 text-center mb-12">See what our community has built</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="relative aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all hover:scale-105">
                  <Image src="/gallery-sword.png" alt="Sword" fill className="object-cover" />
                </div>
                <div className="relative aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all hover:scale-105">
                  <Image src="/gallery-robot.png" alt="Robot Character" fill className="object-cover" />
                </div>
                <div className="relative aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all hover:scale-105">
                  <Image src="/gallery-chest.png" alt="Treasure Chest" fill className="object-cover" />
                </div>
                <div className="relative aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all hover:scale-105">
                  <Image src="/gallery-car.png" alt="Sports Car" fill className="object-cover" />
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div id="pricing" className="mt-24 max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center text-white mb-4">Simple Pricing</h2>
              <p className="text-zinc-400 text-center mb-12">Start free, upgrade when you need more power</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Free Tier */}
                <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl p-8 border border-white/10">
                  <div className="text-zinc-400 font-semibold mb-2">FREE</div>
                  <div className="text-4xl font-black text-white mb-6">$0<span className="text-lg text-zinc-500">/forever</span></div>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                      <span><strong>25</strong> AI Chat Credits <span className="text-zinc-500 text-xs">/month</span></span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                      <span><strong>2</strong> 3D Model Generations <span className="text-zinc-500 text-xs">/month</span></span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 text-sm">⏳</span>
                      <span>World Generations <span className="text-yellow-400 text-xs">(Coming Soon)</span></span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                      <span>Full Toolbox Access</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-sm">✓</span>
                      <span>Studio Plugin</span>
                    </li>
                  </ul>
                  <a href="/auth/discord" className="block w-full py-3 px-6 rounded-xl bg-zinc-800 text-white font-semibold text-center hover:bg-zinc-700 transition-colors">
                    Get Started
                  </a>
                </div>

                {/* Pro Tier */}
                <div className="bg-gradient-to-b from-orange-950/50 to-zinc-950/90 rounded-3xl p-8 border border-orange-500/50 relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
                  <div className="text-orange-400 font-semibold mb-2">PRO</div>
                  <div className="text-4xl font-black text-white mb-6">$30<span className="text-lg text-zinc-500">/month</span></div>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-sm">✓</span>
                      <span><strong>150</strong> AI Chat Credits <span className="text-zinc-500 text-xs">/month</span></span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-sm">✓</span>
                      <span><strong>50</strong> 3D Model Generations <span className="text-zinc-500 text-xs">/month</span></span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 text-sm">⏳</span>
                      <span>World Generations <span className="text-yellow-400 text-xs">(Coming Soon)</span></span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-sm">✓</span>
                      <span>Priority Support</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-sm">✓</span>
                      <span>Early Access Features</span>
                    </li>
                  </ul>
                  <div className="block w-full py-3 px-6 rounded-xl bg-gradient-to-r from-zinc-600 to-zinc-700 text-white/70 font-semibold text-center cursor-not-allowed">
                    Coming Soon 🚀
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-20 bg-black/40 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={24} height={24} className="w-6 h-6" />
                <span>© 2026 BlaxSmith AI. Forging the future of game development.</span>
              </div>
              <div className="flex items-center gap-6">
                <a
                  href="https://discord.gg/xdFVu6cagw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors font-semibold"
                >
                  Discord
                </a>
                <a
                  href="https://www.youtube.com/@Blaxsmith-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-400 transition-colors font-semibold"
                >
                  YouTube
                </a>
                <a
                  href="mailto:brotmank100@gmail.com"
                  className="hover:text-green-400 transition-colors font-semibold"
                >
                  Contact
                </a>
                <a href="/docs" className="hover:text-white transition-colors">
                  Docs
                </a>
                <a href="/terms" className="hover:text-white transition-colors">
                  Terms
                </a>
                <a href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

