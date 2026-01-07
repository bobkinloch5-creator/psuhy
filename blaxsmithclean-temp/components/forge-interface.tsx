"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Sparkles, Box, Map, Download, Loader2, Eye, Check, Send, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { ModelViewer3D } from "@/components/model-viewer-3d"
import { InlineModelViewer } from "@/components/inline-model-viewer"
import { UpgradeModal } from "@/components/upgrade-modal"
import ToolboxBrowser from "@/components/toolbox-browser"
import { PluginStatus } from "@/components/plugin-status"

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
  const [modelError, setModelError] = useState<string | null>(null)
  const [worldError, setWorldError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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
    setModelError(null)

    try {
      const res = await fetch("/api/generate/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: modelPrompt }),
      })
      const data = await res.json()

      if (data.success) {
        setUser({
          ...user,
          model_credits: typeof data.creditsRemaining === "number" ? data.creditsRemaining : user.model_credits - 1,
        })
        setGeneratedModel(data.creation)
        setModelPrompt("")

        if (data.creation?.asset_data?.auto_queued) {
          console.log("[v0] Model automatically queued to Studio")
        }
      } else {
        setModelError(data.error || "Model generation failed")
        console.error("[v0] Model generation error:", data)
      }
    } catch (error) {
      console.error("[v0] Model generation error:", error)
      setModelError("Model generation failed. Please try again.")
    } finally {
      setIsGeneratingModel(false)
    }
  }

  const generateWorld = async () => {
    if (!worldPrompt.trim() || user.world_credits <= 0) return

    setIsGeneratingWorld(true)
    setGeneratedWorld(null)
    setWorldError(null)

    try {
      const res = await fetch("/api/generate/world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: worldPrompt }),
      })
      const data = await res.json()

      if (data.success) {
        setUser({
          ...user,
          world_credits:
            typeof data.worldCreditsRemaining === "number" ? data.worldCreditsRemaining : user.world_credits - 1,
        })
        setGeneratedWorld(data.creation)
        setWorldPrompt("")

        if (data.creation?.asset_data?.auto_queued) {
          console.log("[v0] World automatically queued to Studio")
        }
      } else {
        setWorldError(data.error || "World generation failed")
        console.error("[v0] World generation error:", data)
      }
    } catch (error) {
      console.error("[v0] World generation error:", error)
      setWorldError("World generation failed. Please try again.")
    } finally {
      setIsGeneratingWorld(false)
    }
  }

  const sendModelToStudio = async (model: any) => {
    try {
      const res = await fetch("/api/toolbox/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: model.asset_data?.model_url || model.asset_data?.formats?.glb,
          assetName: model.name,
          assetType: "model",
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert("Model queued for Studio!")
      }
    } catch (error) {
      console.error("[v0] Failed to send to Studio:", error)
      alert("Failed to send to Studio. Make sure Studio is connected.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
      <div className="border-b border-white/10 glassmorphism-dark">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={40} height={40} className="rounded-lg" />
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
                  BlaxSmith AI
                </div>
                <div className="text-xs text-orange-400 font-mono">blaxsmith.dev</div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/5">
                <div
                  className={`w-2 h-2 rounded-full ${studioConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
                />
                <span className="text-sm text-white/70">{studioConnected ? "Studio Connected" : "Studio Offline"}</span>
              </div>

              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade
              </button>

              <div className="flex gap-3">
                <CreditBadge icon={<Sparkles className="w-4 h-4" />} count={user.generation_credits} label="Gen" />
                <CreditBadge icon={<Box className="w-4 h-4" />} count={user.model_credits} label="Model" />
                <CreditBadge icon={<Map className="w-4 h-4" />} count={user.world_credits} label="World" />
              </div>

              <ProfileDropdown
                user={{
                  id: user.id,
                  discord_id: user.discord_id,
                  username: user.username,
                  avatar: user.avatar,
                  is_admin: user.is_admin || false,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glassmorphism rounded-2xl p-6 hover:border-blue-500/30 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
                <Box className="w-6 h-6 text-white" />
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
                placeholder="Describe your 3D model... (e.g., medieval sword)"
                className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                disabled={isGeneratingModel}
                onKeyDown={(e) => e.key === "Enter" && !isGeneratingModel && modelPrompt.trim() && generateModel()}
              />
              <button
                onClick={generateModel}
                disabled={isGeneratingModel || user.model_credits <= 0 || !modelPrompt.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isGeneratingModel ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Forging Model...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Model ({user.model_credits} credits)
                  </>
                )}
              </button>

              {modelError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold text-sm">Generation Failed</p>
                    <p className="text-red-300/80 text-xs mt-1">{modelError}</p>
                  </div>
                </div>
              )}

              {generatedModel && (
                <div className="mt-4 space-y-3 animate-[slide-up_0.5s_ease-out]">
                  {generatedModel.asset_data?.model_url && (
                    <div className="relative">
                      <InlineModelViewer
                        modelUrl={generatedModel.asset_data.model_url}
                        modelName={generatedModel.name}
                      />
                      {generatedModel.asset_data?.auto_queued && studioConnected && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 backdrop-blur-sm">
                          <p className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-3 h-3" />
                            Auto-queued to Studio
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 glassmorphism rounded-xl border-blue-500/30">
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      Model Generated!
                    </h4>
                    <p className="text-white/70 text-sm mb-3">{generatedModel.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {studioConnected && !generatedModel.asset_data?.auto_queued && (
                        <button
                          onClick={() => sendModelToStudio(generatedModel)}
                          className="col-span-2 px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Send to Studio
                        </button>
                      )}
                      <button
                        onClick={() => setShow3DViewer(true)}
                        className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Fullscreen
                      </button>
                      <button
                        onClick={() => {
                          if (generatedModel.asset_data?.model_url) {
                            window.open(generatedModel.asset_data.model_url, "_blank")
                          }
                        }}
                        className="px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                    <button
                      onClick={() => setGeneratedModel(null)}
                      className="w-full mt-2 px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glassmorphism rounded-2xl p-6 hover:border-green-500/30 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30">
                <Map className="w-6 h-6 text-white" />
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
                placeholder="Describe your world... (e.g., tropical island with volcano)"
                className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                disabled={isGeneratingWorld}
                onKeyDown={(e) => e.key === "Enter" && !isGeneratingWorld && worldPrompt.trim() && generateWorld()}
              />
              <button
                onClick={generateWorld}
                disabled={isGeneratingWorld || user.world_credits <= 0 || !worldPrompt.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isGeneratingWorld ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating World...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate World ({user.world_credits} credits)
                  </>
                )}
              </button>

              {worldError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold text-sm">Generation Failed</p>
                    <p className="text-red-300/80 text-xs mt-1">{worldError}</p>
                  </div>
                </div>
              )}

              {generatedWorld && (
                <div className="mt-4 space-y-3 animate-[slide-up_0.5s_ease-out]">
                  {generatedWorld.asset_data?.assets?.[0]?.model_url && (
                    <div className="relative">
                      <InlineModelViewer
                        modelUrl={generatedWorld.asset_data.assets[0].model_url}
                        modelName={`${generatedWorld.name} Preview`}
                      />
                      {generatedWorld.asset_data?.auto_queued && studioConnected && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 backdrop-blur-sm">
                          <p className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-3 h-3" />
                            Auto-queued to Studio
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 glassmorphism border-green-500/30 rounded-xl">
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      World Generated!
                    </h4>
                    {generatedWorld.asset_data?.auto_queued &&
                      studioConnected &&
                      !generatedWorld.asset_data?.assets?.[0]?.model_url && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/40">
                          <p className="text-xs text-green-400 font-semibold flex items-center gap-2">
                            <Send className="w-3 h-3" />
                            World script automatically queued to Studio
                          </p>
                        </div>
                      )}
                    <p className="text-white/70 text-sm mb-2">{generatedWorld.name}</p>
                    <p className="text-white/50 text-xs mb-3">
                      {generatedWorld.asset_data?.assets?.length || 0} assets •{" "}
                      {generatedWorld.asset_data?.themes?.join(", ")} theme
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const { downloadWorldScript } = require("@/lib/downloads")
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
                    <p className="text-xs text-white/40 mt-2">
                      Run script in Roblox Studio Command Bar to import world
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <PluginStatus userId={user.discord_id} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 mb-12">
        <ToolboxBrowser />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 border-t border-white/10">
        <div className="text-center">
          <p className="text-xs text-white/40">Crafted with 🔥 by the BlaxSmith Team • © 2026 blaxsmith.dev</p>
        </div>
      </div>

      {show3DViewer && generatedModel?.asset_data?.model_url && (
        <ModelViewer3D
          modelUrl={generatedModel.asset_data.model_url}
          modelName={generatedModel.name}
          onClose={() => setShow3DViewer(false)}
        />
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={user.subscription_tier || "free"}
      />

      <AIChatSidebar userTier={(user.subscription_tier as any) || "free"} />
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
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border border-white/10 backdrop-blur-sm`}
    >
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
