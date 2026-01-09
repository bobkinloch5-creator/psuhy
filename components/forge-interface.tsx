"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Sparkles, Box, Map, Download, Loader2, Eye, Check, Send, AlertCircle, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { ModelViewer3D } from "@/components/model-viewer-3d"
import { InlineModelViewer } from "@/components/inline-model-viewer"
import { UpgradeModal } from "@/components/upgrade-modal"
import { PluginStatus } from "@/components/plugin-status"
import { BlaxSmith3DGenerator } from "@/components/blaxsmith-3d-generator"
import { MyGallery } from "@/components/my-gallery"

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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] mesh-gradient-bg">
      {/* Beta Notice Banner */}
      <div className="bg-gradient-to-r from-purple-900/80 via-pink-900/60 to-blue-900/80 border-b border-purple-500/30 py-2 px-4 shimmer-effect">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
          <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded text-xs animate-pulse">BETA</span>
          <span className="text-white/90">Some features may not work perfectly. We're working hard on fixes!</span>
          <a href="https://discord.gg/xdFVu6cagw" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline font-medium hover:text-white transition-colors">
            Report issues on Discord
          </a>
        </div>
      </div>
      <div className="border-b border-white/10 glassmorphism-dark">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/blaxsmith-logo.png" alt="BlaxSmith" width={40} height={40} className="rounded-lg float-element" />
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-gradient-animated">
                    BlaxSmith AI
                  </div>
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded shimmer-effect">BETA</span>
                </div>
                <div className="text-xs text-orange-400 font-mono">blaxsmith.dev</div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${studioConnected ? 'bg-green-900/20 border border-green-500/30' : 'bg-black/60 border border-white/5'}`}>
                <div
                  className={`w-2 h-2 rounded-full ${studioConnected ? "bg-green-400 status-dot-glow" : "bg-red-400 animate-pulse"}`}
                  style={studioConnected ? { color: 'rgb(74 222 128)' } : undefined}
                />
                <span className={`text-sm ${studioConnected ? 'text-green-400 font-medium' : 'text-white/70'}`}>{studioConnected ? "Studio Connected" : "Studio Offline"}</span>
              </div>

              <Link
                href="/chat"
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all text-sm flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                AI Chat
              </Link>

              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade
              </button>

              <div className="flex gap-3">
                <CreditBadge icon={<Sparkles className="w-4 h-4" />} count={user.generation_credits} label="Credits" />
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
        {/* Plugin Download Section - Shows when not connected */}
        {!studioConnected && (
          <div className="mb-8 glassmorphism rounded-2xl p-6 border-orange-500/30 bg-gradient-to-r from-orange-900/20 to-red-900/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Install BlaxSmith Plugin</h3>
                  <p className="text-sm text-white/60">Required to send assets to Roblox Studio</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href="/api/plugin/download"
                  download="BlaxSmithPlugin.lua"
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Download Plugin
                </a>
                <a
                  href="/setup"
                  className="px-5 py-2.5 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                  Setup Guide
                </a>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-white/70 mb-2">Your User ID for the plugin:</p>
              <div className="flex items-center gap-3 flex-wrap">
                <code className="px-3 py-2 bg-black/40 rounded-lg text-orange-400 font-mono text-sm select-all">{user.discord_id}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.discord_id)
                    const btn = document.getElementById('copy-uid-btn')
                    if (btn) {
                      btn.textContent = '✓ Copied!'
                      setTimeout(() => { btn.textContent = '📋 Copy ID' }, 2000)
                    }
                  }}
                  id="copy-uid-btn"
                  className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-sm rounded-lg transition-colors font-medium"
                >
                  📋 Copy ID
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <PluginStatus userId={user.discord_id} />
        </div>

        {/* BlaxSmith AI 3D Model Generator - Uses Credits */}
        <div className="mb-6 glass-card-premium rounded-2xl p-4 border-cyan-500/30 animated-border hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30 neon-cyan float-element">
                <Box className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  AI 3D Model Generator
                  <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-bold rounded-full shimmer-effect">CUBE3D</span>
                </h3>
                <p className="text-[10px] text-white/60">Create 3D models with AI using your model credits</p>
              </div>
            </div>
          </div>
          <BlaxSmith3DGenerator
            modelCredits={user.model_credits}
            onCreditsUpdate={(newCredits) => setUser({ ...user, model_credits: newCredits })}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4 border-t border-white/10">
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

