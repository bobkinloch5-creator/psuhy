"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Sparkles, Box, Map, Code, Download, Upload, Loader2, Zap, Cpu, Flame, Eye, Copy, Check, Grid3X3 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { ModelViewer3D } from "@/components/model-viewer-3d"
import { UpgradeModal } from "@/components/upgrade-modal"
import { InlineModelViewer } from "@/components/inline-model-viewer"
import ToolboxBrowser from "@/components/toolbox-browser"

interface User {
  id: string
  discord_id: string
  username: string
  avatar: string | null
  email: string
  generation_credits: number
  model_credits: number
  world_credits: number
  subscription_tier?: string
  is_admin: boolean
}

export function ForgeInterface({ user: initialUser }: { user: User }) {
  const [user, setUser] = useState(initialUser)
  const [modelPrompt, setModelPrompt] = useState("")
  const [worldPrompt, setWorldPrompt] = useState("")
  const [isGeneratingModel, setIsGeneratingModel] = useState(false)
  const [isGeneratingWorld, setIsGeneratingWorld] = useState(false)
  const [generatedModel, setGeneratedModel] = useState<any>(null)
  const [generatedWorld, setGeneratedWorld] = useState<any>(null)
  const [show3DViewer, setShow3DViewer] = useState(false)
  const [studioConnected, setStudioConnected] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [copiedDiscordId, setCopiedDiscordId] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check plugin connection
  useEffect(() => {
    const checkConnection = setInterval(async () => {
      try {
        const res = await fetch(`/api/plugin/status?userId=${user.discord_id}`)
        const data = await res.json()
        setStudioConnected(data.connected)
      } catch {
        setStudioConnected(false)
      }
    }, 5000)
    return () => clearInterval(checkConnection)
  }, [user.discord_id])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const generateModel = async () => {
    if (!modelPrompt.trim() || user.model_credits <= 0) return

    setIsGeneratingModel(true)
    setGeneratedModel(null)

    try {
      const res = await fetch("/api/generate/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: modelPrompt }),
      })
      const data = await res.json()

      if (data.success) {
        setUser({ ...user, model_credits: user.model_credits - 1 })
        setGeneratedModel(data.creation)
        setModelPrompt("")
      } else {
        alert(data.error || "Model generation failed")
      }
    } catch (error) {
      console.error("Model generation error:", error)
      alert("Model generation failed. Please try again.")
    } finally {
      setIsGeneratingModel(false)
    }
  }

  const generateWorld = async () => {
    if (!worldPrompt.trim() || user.world_credits <= 0) return

    setIsGeneratingWorld(true)
    setGeneratedWorld(null)

    try {
      const res = await fetch("/api/generate/world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: worldPrompt }),
      })
      const data = await res.json()

      if (data.success) {
        setUser({ ...user, world_credits: user.world_credits - 1 })
        setGeneratedWorld(data.creation)
        setWorldPrompt("")
      } else {
        alert(data.error || "World generation failed")
      }
    } catch (error) {
      console.error("World generation error:", error)
      alert("World generation failed. Please try again.")
    } finally {
      setIsGeneratingWorld(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={40} height={40} className="rounded-lg" />
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                  BlaxSmith AI
                </div>
                <div className="text-xs text-orange-400 font-mono">blaxsmith.dev</div>
              </div>
            </div>

            {/* Profile & Credits */}
            <div className="flex items-center gap-6">
              {/* Plugin Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/5">
                <div className={`w-2 h-2 rounded-full ${studioConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className="text-sm text-white/70">
                  {studioConnected ? "Studio Connected" : "Studio Offline"}
                </span>
              </div>

              {/* Upgrade Button */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade
              </button>

              {/* Credits */}
              <div className="flex gap-3">
                <CreditBadge icon={<Sparkles className="w-4 h-4" />} count={user.generation_credits} label="Gen" />
                <CreditBadge icon={<Box className="w-4 h-4" />} count={user.model_credits} label="Model" />
                <CreditBadge icon={<Map className="w-4 h-4" />} count={user.world_credits} label="World" />
              </div>

              {/* Profile */}
              <ProfileDropdown user={{ id: user.id, discord_id: user.discord_id, username: user.username, avatar: user.avatar, is_admin: user.is_admin || false }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Model Creator - Clean, no background */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <Box className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Model Creator</h3>
                <p className="text-sm text-white/60">Generate 3D models with Sloyd AI</p>
              </div>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={modelPrompt}
                onChange={(e) => setModelPrompt(e.target.value)}
                placeholder="Describe your 3D model..."
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                disabled={isGeneratingModel}
              />
              <button
                onClick={generateModel}
                disabled={isGeneratingModel || user.model_credits <= 0 || !modelPrompt.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingModel ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Model ({user.model_credits} credits)
                  </>
                )}
              </button>

              {generatedModel && (
                <div className="mt-4 space-y-3">
                  {/* 3D Preview - Sloyd Style */}
                  {generatedModel.asset_data?.preview_url && (
                    <div className="relative w-full h-[300px] rounded-lg overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black border border-blue-500/20">
                      <iframe
                        src={generatedModel.asset_data.preview_url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title={`3D Preview: ${generatedModel.name}`}
                      />
                      <div className="absolute top-2 left-2 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20">
                        <p className="text-xs text-white/80 font-mono">🎨 3D Preview - {generatedModel.name}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="p-4 bg-black/60 border border-blue-500/30 rounded-lg">
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      Model Generated!
                    </h4>
                    <p className="text-white/70 text-sm mb-3">{generatedModel.name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShow3DViewer(true)}
                        className="flex-1 px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Full Screen
                      </button>
                      <button
                        onClick={() => {
                          if (generatedModel.asset_data?.model_url) {
                            window.open(generatedModel.asset_data.model_url, '_blank')
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => setGeneratedModel(null)}
                        className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* World Generator - Clean, no background */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                <Map className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">World Generator</h3>
                <p className="text-sm text-white/60">Create entire Roblox worlds</p>
              </div>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={worldPrompt}
                onChange={(e) => setWorldPrompt(e.target.value)}
                placeholder="Describe your world..."
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                disabled={isGeneratingWorld}
              />
              <button
                onClick={generateWorld}
                disabled={isGeneratingWorld || user.world_credits <= 0 || !worldPrompt.trim()}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeneratingWorld ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate World ({user.world_credits} credits)
                  </>
                )}
              </button>

              {generatedWorld && (
                <div className="mt-4 p-4 bg-black/40 border border-green-500/30 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">✅ World Generated!</h4>
                  <p className="text-white/70 text-sm mb-2">{generatedWorld.name}</p>
                  <p className="text-white/50 text-xs mb-3">{generatedWorld.asset_data?.assets?.length || 0} assets ready to import</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const { downloadWorldScript } = require('@/lib/downloads')
                        downloadWorldScript(generatedWorld.asset_data, generatedWorld.name)
                      }}
                      className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Script
                    </button>
                    <button
                      onClick={() => setGeneratedWorld(null)}
                      className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-white/40 mt-2">Run script in Roblox Studio Command Bar to import world</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plugin Info - Compact */}
        <div className="max-w-md mx-auto">
          <FeatureCard
            title="Roblox Studio Plugin"
            description="Connect & sync your creations"
            icon={<Upload className="w-5 h-5" />}
            gradient="from-orange-900/20 to-red-900/20"
            accentColor="orange"
          >
            <div className="space-y-3 py-3">
              {/* Discord ID Display */}
              <div className="max-w-sm mx-auto">
                <label className="block text-xs text-white/60 mb-1 text-center">
                  Your Discord ID (for plugin)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-black/60 border border-white/20 rounded-lg font-mono text-white text-center text-sm">
                    {user.discord_id}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.discord_id)
                      setCopiedDiscordId(true)
                      setTimeout(() => setCopiedDiscordId(false), 2000)
                    }}
                    className="p-2 bg-orange-500/20 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
                    title="Copy Discord ID"
                  >
                    {copiedDiscordId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1 text-center">
                  Use this ID in the plugin to connect Roblox Studio
                </p>
              </div>

              {/* Connection Status / Download */}
              {studioConnected ? (
                <div className="text-green-400 text-center">
                  <Zap className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p className="font-semibold">Connected to Roblox Studio!</p>
                  <p className="text-xs mt-1 text-white/60">Ready to send creations</p>
                </div>
              ) : (
                <div className="text-center">
                  <Cpu className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                  <p className="font-semibold text-white text-sm mb-1">Plugin Not Connected</p>
                  <p className="text-xs text-white/60 mb-3">Download and install in Roblox Studio</p>
                  <a
                    href="/api/plugin/download"
                    download="BlaxSmithPlugin.lua"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download Plugin
                  </a>
                </div>
              )}
            </div>
          </FeatureCard>
        </div>
      </div>

      {/* AI Toolbox */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <ToolboxBrowser />
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-8 border-t border-white/10">
        <div className="text-center">
          <p className="text-xs text-white/40">
            Crafted with 🔥 by the BlaxSmith Team • © 2026 blaxsmith.dev
          </p>
        </div>
      </div>

      {/* 3D Model Viewer Modal */}
      {show3DViewer && generatedModel && (
        <ModelViewer3D
          modelName={generatedModel.name}
          modelUrl={generatedModel.asset_data?.model_url}
          onClose={() => setShow3DViewer(false)}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={user.subscription_tier || "free"}
      />

      {/* AI Chat Sidebar */}
      <AIChatSidebar userTier={user.subscription_tier as any || "free"} />
    </div>
  )
}

function FeatureCard({
  title,
  description,
  icon,
  gradient,
  accentColor,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  gradient: string
  accentColor: string
  children: React.ReactNode
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border border-white/10 backdrop-blur-sm`}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg bg-${accentColor}-500/20 border border-${accentColor}-500/30`}>{icon}</div>
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-sm text-white/60">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function CreditBadge({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
      <div className="text-orange-400">{icon}</div>
      <div>
        <div className="text-xs text-white/60">{label}</div>
        <div className="text-sm font-bold text-white">{count.toLocaleString()}</div>
      </div>
    </div>
  )
}
