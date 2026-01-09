import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Anvil, Zap, Box, Map, Sparkles, ArrowRight, Download, Play, CheckCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
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
              <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
                BlaxSmith AI
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/plugin" className="px-4 py-2 text-white/70 hover:text-white font-semibold transition-colors">
                Get Plugin
              </Link>
              <Link
                href="/auth/login"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Sign In
              </Link>
            </div>
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
                    filter: "drop-shadow(0 0 80px rgba(249, 115, 22, 0.6))",
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
              The world's best AI-powered Roblox game builder. Generate stunning 3D models, entire game worlds, and
              connect directly to Roblox Studio. No API keys needed.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white text-xl font-bold rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-orange-500/40 group"
              >
                <Anvil className="w-7 h-7" />
                Start Creating Free
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/plugin"
                className="inline-flex items-center gap-3 px-8 py-5 bg-white/10 border border-white/20 text-white text-xl font-bold rounded-2xl hover:bg-white/15 transition-all"
              >
                <Download className="w-6 h-6" />
                Get Studio Plugin
              </Link>
            </div>

            {/* Roblox Studio Showcase */}
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-16">
              <div className="aspect-video relative bg-zinc-900">
                <Image
                  src="/roblox-studio-dark-interface-with-3d-game-editor-s.jpg"
                  alt="BlaxSmith in Roblox Studio"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold text-lg">See BlaxSmith in Action</p>
                      <p className="text-white/60 text-sm">Watch AI generate assets directly in Roblox Studio</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              {/* 3D Models Card */}
              <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 rounded-3xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all group hover:scale-[1.02] cursor-pointer shadow-xl">
                <div className="relative h-48 overflow-hidden bg-zinc-800">
                  <Image
                    src="/roblox-style-blocky-3d-character-models-lineup.jpg"
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
                <div className="relative h-48 overflow-hidden bg-zinc-800">
                  <Image
                    src="/roblox-game-world-fantasy-island-with-floating-pla.jpg"
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
                <div className="relative h-48 overflow-hidden bg-zinc-800">
                  <Image
                    src="/roblox-studio-plugin-panel-dark-ui-with-glowing-bu.jpg"
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
                  <h3 className="text-xl font-bold text-white mb-2">Magic Sync</h3>
                  <p className="text-zinc-400 text-sm">
                    Assets appear instantly in Roblox Studio. No manual imports, no API keys - just magic.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="mt-24 max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center text-white mb-4">How It Works</h2>
              <p className="text-zinc-400 text-center mb-12">From idea to in-game in seconds</p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { step: "1", title: "Sign Up", desc: "Create your free account", icon: Sparkles },
                  { step: "2", title: "Install Plugin", desc: "Add BlaxSmith to Studio", icon: Download },
                  { step: "3", title: "Paste Token", desc: "Connect with one click", icon: Zap },
                  { step: "4", title: "Create", desc: "Generate & auto-insert", icon: CheckCircle },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                      <item.icon className="w-8 h-8 text-orange-400" />
                    </div>
                    <div className="text-orange-400 font-mono text-sm mb-2">Step {item.step}</div>
                    <h3 className="text-white font-bold mb-1">{item.title}</h3>
                    <p className="text-zinc-500 text-sm">{item.desc}</p>
                  </div>
                ))}
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
                <div className="text-4xl font-black text-red-500 mb-2">4.9</div>
                <div className="text-zinc-500 text-sm">User Rating</div>
              </div>
            </div>

            {/* Final CTA */}
            <div className="mt-24 text-center">
              <h2 className="text-3xl font-black text-white mb-4">Ready to Start?</h2>
              <p className="text-zinc-400 mb-8">Join thousands of Roblox creators using BlaxSmith AI</p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white text-xl font-bold rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-orange-500/40"
              >
                <Anvil className="w-7 h-7" />
                Create Free Account
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-24">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={32} height={32} className="w-8 h-8" />
                <span className="text-zinc-500 text-sm">BlaxSmith AI</span>
              </div>
              <div className="flex items-center gap-6 text-zinc-500 text-sm">
                <Link href="/plugin" className="hover:text-white transition-colors">
                  Plugin
                </Link>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
