import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import { Download, CheckCircle, ArrowRight, Zap, Shield, RefreshCw, Sparkles } from "lucide-react"
import Link from "next/link"
import { PluginTokenDisplay } from "@/components/plugin-token-display"
import { PluginPairInput } from "@/components/plugin-pair-input"

export default async function PluginPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let pluginToken = null
  if (authUser) {
    const { data: user } = await supabase.from("users").select("plugin_token").eq("auth_id", authUser.id).single()
    pluginToken = user?.plugin_token
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-orange-600/15 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-red-600/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
                BlaxSmith AI
              </h1>
            </Link>
            {authUser ? (
              <Link
                href="/forge"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30"
              >
                Go to Forge
              </Link>
            ) : (
              <Link
                href="/"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30"
              >
                Login
              </Link>
            )}
          </div>
        </header>

        <main className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-sm font-semibold mb-6">
                <Zap className="w-4 h-4" />
                Roblox Studio Plugin v6.5
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                  Magic Sync
                </span>{" "}
                for Studio
              </h1>
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                Generate assets on the website and watch them appear instantly in Roblox Studio. No API keys, no manual
                imports - just magic.
              </p>
            </div>

            {/* Pairing code input for logged in users */}
            {authUser && (
              <PluginPairInput />
            )}

            {/* Token Display for logged in users */}
            {pluginToken && (
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/40 rounded-3xl p-8 mb-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Your Plugin Token</h2>
                    <p className="text-green-300/80">Copy this token and paste it into the plugin</p>
                  </div>
                </div>

                <PluginTokenDisplay token={pluginToken} />

                <p className="text-green-300/60 text-sm mt-4">
                  This token is unique to your account. Never share it with others.
                </p>
              </div>
            )}

            {/* Not logged in prompt */}
            {!authUser && (
              <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 mb-12 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Get Your Plugin Token</h2>
                <p className="text-zinc-400 mb-6">Sign up or log in to get your unique plugin token for Magic Sync</p>
                <div className="flex items-center justify-center gap-4">
                  <Link
                    href="/"
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30"
                  >
                    Login with Discord
                  </Link>
                </div>
              </div>
            )}

            {/* Installation Steps */}
            <div className="bg-zinc-900/50 rounded-3xl border border-white/10 p-8 mb-12">
              <h2 className="text-2xl font-bold text-white mb-8">Installation Guide</h2>

              <div className="space-y-8">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Download the Plugin</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Get the BlaxSmith Studio Plugin file. Compatible with all Roblox Studio versions.
                    </p>
                    <a
                      href="/api/plugin/download"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-orange-500/30"
                    >
                      <Download className="w-5 h-5" />
                      Download Plugin v6.5.0
                    </a>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Install in Roblox Studio</h3>
                    <p className="text-zinc-400 text-sm mb-3">
                      Move the downloaded file to your Roblox Studio plugins folder:
                    </p>
                    <div className="space-y-2">
                      <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-zinc-300">
                        <span className="text-orange-400">Windows:</span> %LOCALAPPDATA%\Roblox\Plugins\
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-zinc-300">
                        <span className="text-orange-400">Mac:</span> ~/Documents/Roblox/Plugins/
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Enable HTTP Requests</h3>
                    <p className="text-zinc-400 text-sm mb-3">
                      In Roblox Studio, go to <strong className="text-white">Game Settings → Security</strong> and
                      enable:
                    </p>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Allow HTTP Requests
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Paste Your Token</h3>
                    <p className="text-zinc-400 text-sm mb-2">
                      Open the plugin in Studio, paste your token from above, and click Connect. That's it!
                    </p>
                    <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      No API keys or developer setup required
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Plugin Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6 hover:border-orange-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Magic Sync</h3>
                <p className="text-zinc-400 text-sm">
                  Assets appear in your workspace the moment you generate them. No refresh needed.
                </p>
              </div>
              <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6 hover:border-green-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Token Auth</h3>
                <p className="text-zinc-400 text-sm">
                  Secure authentication without API keys. Your unique token keeps your creations safe.
                </p>
              </div>
              <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6 hover:border-blue-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <RefreshCw className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">Undo Support</h3>
                <p className="text-zinc-400 text-sm">
                  Every insert creates a waypoint. Use Ctrl+Z to undo any AI generation.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <p className="text-zinc-400 mb-4">Ready to supercharge your Roblox development?</p>
              {authUser ? (
                <Link
                  href="/forge"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-bold rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-orange-500/30"
                >
                  Go to Forge
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-bold rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-orange-500/30"
                >
                  Start Creating Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
